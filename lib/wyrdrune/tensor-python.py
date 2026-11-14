"""Independent Python CPU backend for Wyrdrune Tensor IR v0.1.

Consumes only a JS-compiled, WCE-1-fingerprinted Tensor IR and numeric feeds.
No eval, source parsing, filesystem access beyond this pinned module, network,
provider dispatch, persistence or canon writes.
"""
import json
import math
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from canonical import digest

ENGINE = "wyrdrune-tensor/0.1.0"
MAX_ELEMENTS = 1_000_000


def shape_size(shape):
    size = 1
    for dim in shape:
        if isinstance(dim, bool) or not isinstance(dim, int) or dim < 1:
            raise ValueError("Invalid tensor dimension")
        size *= dim
        if size > MAX_ELEMENTS:
            raise ValueError("Tensor element limit exceeded")
    return size


def strides_for(shape):
    result = [0] * len(shape)
    stride = 1
    for index in range(len(shape) - 1, -1, -1):
        result[index] = stride
        stride *= shape[index]
    return result


def coords_from_index(index, shape):
    strides = strides_for(shape)
    return [(index // strides[axis]) % dim for axis, dim in enumerate(shape)]


def index_from_coords(coords, shape):
    return sum(coordinate * stride for coordinate, stride in zip(coords, strides_for(shape)))


def broadcast_offset(index, output_shape, input_shape):
    out_strides = strides_for(output_shape)
    in_strides = strides_for(input_shape)
    pad = len(output_shape) - len(input_shape)
    offset = 0
    for axis, dim in enumerate(input_shape):
        out_axis = pad + axis
        if dim != 1:
            coordinate = (index // out_strides[out_axis]) % output_shape[out_axis]
            offset += coordinate * in_strides[axis]
    return offset


def cast(value, dtype):
    if not math.isfinite(value):
        raise ValueError("Non-finite tensor result")
    if dtype == "f32":
        try:
            value = struct.unpack("!f", struct.pack("!f", value))[0]
        except OverflowError as error:
            raise ValueError("f32 tensor overflow") from error
    if not math.isfinite(value):
        raise ValueError("Tensor precision overflow")
    return value


def flatten(value, output=None):
    if output is None:
        output = []
    if isinstance(value, list):
        for item in value:
            flatten(item, output)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(value):
            raise ValueError("Tensor feeds must be finite")
        output.append(float(value))
    else:
        raise TypeError("Tensor feeds must contain only finite numbers")
    return output


def estimate_operations(program, definitions):
    total = 0
    for node in program["nodes"]:
        cost = shape_size(node["shape"])
        if node["op"] == "sum":
            cost = shape_size(definitions[node["args"][0]]["shape"])
        elif node["op"] == "matmul":
            cost *= 2 * definitions[node["args"][0]]["shape"][1]
        total += cost
    return total


def execute(program, feeds, max_operations=20_000_000):
    if not isinstance(program, dict) or program.get("schema") != "wyrdrune.tensor-ir/v0.1":
        raise TypeError("Unsupported tensor IR schema")
    if not isinstance(feeds, dict):
        raise TypeError("Tensor feeds must be a record")
    if isinstance(max_operations, bool) or not isinstance(max_operations, int) or not 1 <= max_operations <= 100_000_000:
        raise ValueError("Invalid tensor operation limit")

    payload = {
        "schema": program["schema"],
        "inputs": program["inputs"],
        "nodes": program["nodes"],
        "outputs": program["outputs"],
    }
    if digest(payload) != program.get("fingerprint"):
        raise ValueError("Tensor IR fingerprint mismatch")

    definitions = {}
    for item in program["inputs"]:
        definitions[item["id"]] = item
    for item in program["nodes"]:
        definitions[item["id"]] = item

    allowed = {item["id"] for item in program["inputs"]}
    extra = set(feeds) - allowed
    if extra:
        raise TypeError("Unexpected tensor feed " + sorted(extra)[0])

    estimate = estimate_operations(program, definitions)
    if estimate > max_operations:
        raise ValueError("Tensor operation budget exceeded: " + str(estimate) + " > " + str(max_operations))

    values = {}
    normalized_feeds = {}
    for item in program["inputs"]:
        name = item["id"]
        if name not in feeds:
            raise KeyError("Missing tensor feed " + name)
        data = flatten(feeds[name])
        expected = shape_size(item["shape"])
        if len(data) != expected:
            raise ValueError("Feed " + name + " has " + str(len(data)) + " values; expected " + str(expected))
        data = [cast(value, item["dtype"]) for value in data]
        values[name] = data
        normalized_feeds[name] = data

    operation_count = 0
    for node in program["nodes"]:
        op = node["op"]
        args = [values[name] for name in node["args"]]
        defs = [definitions[name] for name in node["args"]]
        size = shape_size(node["shape"])
        dtype = node["dtype"]
        result = []

        if op == "const":
            result = [cast(value, dtype) for value in node["values"]]
        elif op in ("neg", "exp", "log", "sin", "cos", "sqrt"):
            for value in args[0]:
                if op == "neg":
                    computed = -value
                elif op == "exp":
                    try:
                        computed = math.exp(value)
                    except OverflowError:
                        computed = math.inf
                elif op == "log":
                    computed = math.log(value) if value > 0 else math.nan
                elif op == "sin":
                    computed = math.sin(value)
                elif op == "cos":
                    computed = math.cos(value)
                else:
                    computed = math.sqrt(value) if value >= 0 else math.nan
                result.append(cast(computed, dtype))
                operation_count += 1
        elif op in ("add", "sub", "mul", "div"):
            for index in range(size):
                a = args[0][broadcast_offset(index, node["shape"], defs[0]["shape"])]
                b = args[1][broadcast_offset(index, node["shape"], defs[1]["shape"])]
                if op == "add":
                    computed = a + b
                elif op == "sub":
                    computed = a - b
                elif op == "mul":
                    computed = a * b
                else:
                    if b == 0:
                        raise ValueError("Division by zero in tensor node " + node["id"])
                    computed = a / b
                result.append(cast(computed, dtype))
                operation_count += 1
        elif op == "sum":
            source = args[0]
            if node["axis"] is None:
                total = 0.0
                for value in source:
                    total += value
                result = [cast(total, dtype)]
                operation_count += len(source)
            else:
                result = [0.0] * size
                input_shape = defs[0]["shape"]
                for index, value in enumerate(source):
                    coordinates = coords_from_index(index, input_shape)
                    coordinates.pop(node["axis"])
                    out_index = index_from_coords(coordinates, node["shape"])
                    result[out_index] = cast(result[out_index] + value, dtype)
                    operation_count += 1
        elif op == "matmul":
            m, k = defs[0]["shape"]
            n = defs[1]["shape"][1]
            result = [0.0] * size
            for row in range(m):
                for col in range(n):
                    total = 0.0
                    for inner in range(k):
                        total += args[0][row * k + inner] * args[1][inner * n + col]
                        operation_count += 2
                    result[row * n + col] = cast(total, dtype)
        elif op == "transpose":
            result = [0.0] * size
            for index in range(size):
                out_coordinates = coords_from_index(index, node["shape"])
                in_coordinates = [0] * len(defs[0]["shape"])
                for output_axis, input_axis in enumerate(node["permutation"]):
                    in_coordinates[input_axis] = out_coordinates[output_axis]
                result[index] = args[0][index_from_coords(in_coordinates, defs[0]["shape"])]
                operation_count += 1
        elif op == "reshape":
            result = list(args[0])
            operation_count += size
        elif op == "view":
            for index in range(size):
                coordinates = coords_from_index(index, node["shape"])
                source_index = node["offset"] + sum(
                    coordinate * stride for coordinate, stride in zip(coordinates, node["strides"])
                )
                result.append(args[0][source_index])
                operation_count += 1
        else:
            raise TypeError("Unsupported tensor operation " + str(op))

        if len(result) != size or any(not math.isfinite(value) for value in result):
            raise ValueError("Non-finite or malformed result in tensor node " + node["id"])
        values[node["id"]] = result

    outputs = {}
    for output_id in program["outputs"]:
        definition = definitions[output_id]
        outputs[output_id] = {
            "shape": list(definition["shape"]),
            "dtype": definition["dtype"],
            "values": values[output_id],
        }

    precision = sorted({item["dtype"] for item in program["inputs"] + program["nodes"]})
    return {
        "schema": "wyrdrune.tensor-result/v0.1",
        "engine": ENGINE,
        "programFingerprint": program["fingerprint"],
        "feedsDigest": digest(normalized_feeds),
        "outputs": outputs,
        "execution": {
            "backend": "python-reference",
            "operationCount": operation_count,
            "estimatedOperations": estimate,
            "precision": precision,
            "gpuExecuted": False,
        },
    }


def main():
    raw = sys.stdin.buffer.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError("Tensor request too large")
    envelope = json.loads(raw.decode("utf-8"))
    result = execute(
        envelope["program"],
        envelope["feeds"],
        envelope.get("maxOperations", 20_000_000),
    )
    sys.stdout.write(json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":")))
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        sys.stderr.write(type(error).__name__ + ": " + str(error) + "\n")
        sys.exit(1)
