use std::fmt;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

const MAX_RESPONSE_BYTES: u64 = 1_048_576;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Endpoint {
    pub host: String,
    pub port: u16,
    pub base_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BridgeError {
    InvalidUrl(String),
    NonLoopbackHost(String),
    UnsupportedProtocol(String),
    ResolveFailed(String),
    ConnectFailed(String),
    IoFailed(String),
    InvalidHttp(String),
    UpstreamStatus(u16),
}

impl fmt::Display for BridgeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidUrl(message) => write!(f, "invalid endpoint: {message}"),
            Self::NonLoopbackHost(host) => write!(f, "non-loopback host is forbidden: {host}"),
            Self::UnsupportedProtocol(protocol) => {
                write!(f, "unsupported protocol for dependency-free probe: {protocol}")
            }
            Self::ResolveFailed(message) => write!(f, "address resolution failed: {message}"),
            Self::ConnectFailed(message) => write!(f, "connection failed: {message}"),
            Self::IoFailed(message) => write!(f, "I/O failed: {message}"),
            Self::InvalidHttp(message) => write!(f, "invalid HTTP response: {message}"),
            Self::UpstreamStatus(status) => write!(f, "upstream returned HTTP {status}"),
        }
    }
}

impl std::error::Error for BridgeError {}

impl Endpoint {
    pub fn parse(input: &str) -> Result<Self, BridgeError> {
        let input = input.trim();
        let (protocol, rest) = input
            .split_once("://")
            .ok_or_else(|| BridgeError::InvalidUrl("missing protocol".into()))?;

        if protocol != "http" {
            return Err(BridgeError::UnsupportedProtocol(protocol.into()));
        }
        if rest.contains('@') {
            return Err(BridgeError::InvalidUrl(
                "embedded credentials are forbidden".into(),
            ));
        }
        if rest.contains('?') || rest.contains('#') {
            return Err(BridgeError::InvalidUrl(
                "query strings and fragments are forbidden".into(),
            ));
        }

        let (authority, raw_path) = match rest.split_once('/') {
            Some((authority, path)) => (authority, path),
            None => (rest, ""),
        };
        if authority.is_empty() {
            return Err(BridgeError::InvalidUrl("missing host".into()));
        }

        let (host, port) = match authority.rsplit_once(':') {
            Some((host, port_text)) if !host.is_empty() => {
                let port = port_text
                    .parse::<u16>()
                    .map_err(|_| BridgeError::InvalidUrl("invalid port".into()))?;
                (host.to_ascii_lowercase(), port)
            }
            _ => (authority.to_ascii_lowercase(), 80),
        };

        if !matches!(host.as_str(), "127.0.0.1" | "localhost") {
            return Err(BridgeError::NonLoopbackHost(host));
        }

        let mut base_path = format!("/{}", raw_path.trim_matches('/'));
        if base_path == "/" {
            base_path = "/v1".into();
        } else if !base_path.ends_with("/v1") {
            base_path.push_str("/v1");
        }

        Ok(Self {
            host,
            port,
            base_path,
        })
    }

    pub fn models_path(&self) -> String {
        format!("{}/models", self.base_path.trim_end_matches('/'))
    }

    pub fn display_url(&self) -> String {
        format!("http://{}:{}{}", self.host, self.port, self.base_path)
    }

    fn socket_addresses(&self) -> Result<Vec<SocketAddr>, BridgeError> {
        let value = format!("{}:{}", self.host, self.port);
        value
            .to_socket_addrs()
            .map(|addresses| addresses.collect())
            .map_err(|error| BridgeError::ResolveFailed(error.to_string()))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EngineStatus {
    pub reachable: bool,
    pub endpoint: String,
    pub latency_ms: u128,
    pub models: Vec<String>,
    pub error: Option<String>,
}

impl EngineStatus {
    pub fn to_json(&self) -> String {
        let models = self
            .models
            .iter()
            .map(|model| format!("\"{}\"", json_escape(model)))
            .collect::<Vec<_>>()
            .join(",");
        let error = match &self.error {
            Some(error) => format!("\"{}\"", json_escape(error)),
            None => "null".into(),
        };
        format!(
            "{{\"reachable\":{},\"endpoint\":\"{}\",\"latency_ms\":{},\"models\":[{}],\"error\":{}}}",
            self.reachable,
            json_escape(&self.endpoint),
            self.latency_ms,
            models,
            error
        )
    }
}

pub fn probe_models(endpoint: &Endpoint, timeout: Duration) -> EngineStatus {
    let started = Instant::now();
    match request_models(endpoint, timeout) {
        Ok(models) => EngineStatus {
            reachable: true,
            endpoint: endpoint.display_url(),
            latency_ms: started.elapsed().as_millis(),
            models,
            error: None,
        },
        Err(error) => EngineStatus {
            reachable: false,
            endpoint: endpoint.display_url(),
            latency_ms: started.elapsed().as_millis(),
            models: Vec::new(),
            error: Some(error.to_string()),
        },
    }
}

fn request_models(endpoint: &Endpoint, timeout: Duration) -> Result<Vec<String>, BridgeError> {
    let addresses = endpoint.socket_addresses()?;
    let mut last_error = None;
    let mut stream = None;

    for address in addresses {
        match TcpStream::connect_timeout(&address, timeout) {
            Ok(value) => {
                stream = Some(value);
                break;
            }
            Err(error) => last_error = Some(error),
        }
    }

    let mut stream = stream.ok_or_else(|| {
        BridgeError::ConnectFailed(
            last_error
                .map(|error| error.to_string())
                .unwrap_or_else(|| "no loopback address resolved".into()),
        )
    })?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|error| BridgeError::IoFailed(error.to_string()))?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|error| BridgeError::IoFailed(error.to_string()))?;

    let request = format!(
        "GET {} HTTP/1.1\r\nHost: {}:{}\r\nAccept: application/json\r\nConnection: close\r\n\r\n",
        endpoint.models_path(),
        endpoint.host,
        endpoint.port
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| BridgeError::IoFailed(error.to_string()))?;

    let mut bytes = Vec::new();
    stream
        .take(MAX_RESPONSE_BYTES)
        .read_to_end(&mut bytes)
        .map_err(|error| BridgeError::IoFailed(error.to_string()))?;
    let response = String::from_utf8_lossy(&bytes);
    let (head, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| BridgeError::InvalidHttp("missing header boundary".into()))?;
    let status_line = head
        .lines()
        .next()
        .ok_or_else(|| BridgeError::InvalidHttp("missing status line".into()))?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| BridgeError::InvalidHttp("invalid status line".into()))?;
    if !(200..300).contains(&status) {
        return Err(BridgeError::UpstreamStatus(status));
    }

    Ok(extract_model_ids(body))
}

pub fn extract_model_ids(json: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut cursor = 0;

    while let Some(relative) = json[cursor..].find("\"id\"") {
        let key_end = cursor + relative + 4;
        let remainder = &json[key_end..];
        let Some(colon_relative) = remainder.find(':') else {
            break;
        };
        let after_colon = &remainder[colon_relative + 1..];
        let Some(quote_relative) = after_colon.find('"') else {
            break;
        };
        let string_start = key_end + colon_relative + 1 + quote_relative + 1;
        if let Some((value, consumed)) = parse_json_string(&json[string_start..]) {
            if !value.is_empty() && !values.contains(&value) {
                values.push(value);
            }
            cursor = string_start + consumed;
        } else {
            cursor = string_start;
        }
    }

    values
}

fn parse_json_string(input: &str) -> Option<(String, usize)> {
    let mut output = String::new();
    let mut escaped = false;

    for (index, character) in input.char_indices() {
        if escaped {
            let decoded = match character {
                '"' => '"',
                '\\' => '\\',
                '/' => '/',
                'b' => '\u{0008}',
                'f' => '\u{000c}',
                'n' => '\n',
                'r' => '\r',
                't' => '\t',
                other => other,
            };
            output.push(decoded);
            escaped = false;
            continue;
        }
        match character {
            '\\' => escaped = true,
            '"' => return Some((output, index + 1)),
            other => output.push(other),
        }
    }
    None
}

fn json_escape(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_loopback_endpoint_and_supplies_v1() {
        let endpoint = Endpoint::parse("http://127.0.0.1:1337").unwrap();
        assert_eq!(endpoint.port, 1337);
        assert_eq!(endpoint.base_path, "/v1");
        assert_eq!(endpoint.models_path(), "/v1/models");
    }

    #[test]
    fn rejects_non_loopback_hosts() {
        let error = Endpoint::parse("http://192.168.1.12:1337/v1").unwrap_err();
        assert!(matches!(error, BridgeError::NonLoopbackHost(_)));
    }

    #[test]
    fn extracts_unique_model_ids() {
        let models = extract_model_ids(
            r#"{"object":"list","data":[{"id":"qwen-local"},{"id":"gemma-local"},{"id":"qwen-local"}]}"#,
        );
        assert_eq!(models, vec!["qwen-local", "gemma-local"]);
    }

    #[test]
    fn status_json_is_machine_readable_in_shape() {
        let status = EngineStatus {
            reachable: false,
            endpoint: "http://127.0.0.1:1337/v1".into(),
            latency_ms: 2,
            models: vec![],
            error: Some("connection \"refused\"".into()),
        };
        let json = status.to_json();
        assert!(json.contains("\"reachable\":false"));
        assert!(json.contains("connection \\\"refused\\\""));
    }
}
