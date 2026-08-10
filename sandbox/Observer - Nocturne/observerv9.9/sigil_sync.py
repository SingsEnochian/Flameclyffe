import os
import json
import math
from PIL import Image, ImageDraw
import numpy as np
from skimage.metrics import structural_similarity as ssim
import cv2

# Add logging to a file
import logging

# Configure logging to write to glyph_debug.log
logging.basicConfig(
    filename='glyph_debug.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filemode='a'  # Append to the file to keep logs from multiple runs
)

class SigilSync:
    def __init__(self, glyph_dir):
        self.glyph_dir = glyph_dir
        self.validation_report = {}
        self.validation_status = None

    def trace_chaos_to_points(self, chaos_signature, radius=120, angle_offset=0, size=600):
        """Rebuild expected points from chaos signature to match visual curve."""
        center = size // 2
        num_points = len(chaos_signature)
        expected_points = []

        for i in range(num_points):
            value = chaos_signature[i]
            angle = (i / num_points) * 2 * math.pi + angle_offset
            r = radius * abs(value)
            x = center + r * math.cos(angle)
            y = center + r * math.sin(angle)
            expected_points.append((x, y))

        return expected_points

    def preprocess_image_for_edges(self, img, is_cairo=False):
        """Preprocess the image to enhance edge detection."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        if is_cairo:
            gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)

        gray = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        return gray

    def select_main_contour(self, contours, expected_points=11, image_path="unknown"):
        """Select the main contour based on vertex count and area."""
        candidates = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 5000 or area > 500000:
                continue
            epsilon = 0.01 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            num_vertices = len(approx)
            if 5 <= num_vertices <= 20:
                vertex_diff = abs(num_vertices - expected_points)
                score = vertex_diff * 1000 - area
                candidates.append((contour, approx, score))

        if not candidates:
            print(f"No contours within area range in {image_path}")
            logging.info(f"No contours within area range in {image_path}")
            return None, None

        main_contour, main_approx, _ = min(candidates, key=lambda x: x[2])
        return main_contour, main_approx

    def extract_image_points(self, image_path, is_cairo=False):
        """Extract the main shape points from the rendered glyph image."""
        img = cv2.imread(image_path)
        if img is None:
            error_msg = f"Could not load image: {image_path}"
            print(error_msg)
            logging.error(error_msg)
            raise ValueError(error_msg)

        gray = self.preprocess_image_for_edges(img, is_cairo)
        edges = cv2.Canny(gray, 30, 100)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        edges = cv2.dilate(edges, kernel, iterations=1)
        edges = cv2.erode(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            print(f"No contours found in {image_path}")
            logging.info(f"No contours found in {image_path}")
            return []

        main_contour, main_approx = self.select_main_contour(contours, expected_points=11, image_path=image_path)
        if main_contour is None:
            return []

        contour_points = [(point[0][0], point[0][1]) for point in main_approx]

        top_left_ref = min(contour_points, key=lambda p: p[0] + p[1])
        idx = contour_points.index(top_left_ref)
        contour_points = contour_points[idx:] + contour_points[:idx]

        expected_points = 11
        if len(contour_points) > expected_points:
            # Improved sampling to avoid duplicates
            indices = np.linspace(0, len(contour_points) - 1, expected_points, dtype=int)
            contour_points = [contour_points[i] for i in indices]
        elif len(contour_points) < expected_points:
            new_points = []
            for i in range(len(contour_points)):
                x1, y1 = contour_points[i]
                x2, y2 = contour_points[(i + 1) % len(contour_points)]
                new_points.append((x1, y1))
                needed_points = (expected_points - len(contour_points)) // len(contour_points) + 1
                for j in range(1, needed_points):
                    t = j / needed_points
                    x = x1 + t * (x2 - x1)
                    y = y1 + t * (y2 - y1)
                    new_points.append((x, y))
            contour_points = new_points[:expected_points]

        print(f"Extracted points in {image_path}: {len(contour_points)} points")
        logging.info(f"Extracted points in {image_path}: {len(contour_points)} points")
        return contour_points

    def compare_points(self, expected_points, actual_points, threshold=200):
        """Compare expected points to actual points with a distance threshold."""
        if len(expected_points) != len(actual_points):
            error_msg = f"Number of points mismatch: expected {len(expected_points)}, found {len(actual_points)}"
            print(error_msg)
            logging.info(error_msg)
            return False, error_msg

        distances = []
        for (ex, ey), (ax, ay) in zip(expected_points, actual_points):
            distance = math.sqrt((ex - ax) ** 2 + (ey - ay) ** 2)
            distances.append(distance)

        avg_distance = sum(distances) / len(distances)
        if avg_distance > threshold:
            error_msg = f"Average point distance {avg_distance:.2f} exceeds threshold {threshold}"
            print(error_msg)
            logging.info(error_msg)
            return False, error_msg
        success_msg = f"Average point distance {avg_distance:.2f} within threshold"
        print(success_msg)
        logging.info(success_msg)
        return True, success_msg

    def compare_visual_forms(self, image_a_path, image_b_path, threshold=0.65):
        """Compare two glyph images and flag excessive deviation using SSIM."""
        img_a = cv2.imread(image_a_path)
        img_b = cv2.imread(image_b_path)

        if img_a is None or img_b is None:
            error_msg = "One or both images could not be loaded"
            print(error_msg)
            logging.info(error_msg)
            return False, error_msg

        gray_a = self.preprocess_image_for_edges(img_a, is_cairo=False)
        gray_b = self.preprocess_image_for_edges(img_b, is_cairo=True)

        contours_a, _ = cv2.findContours(gray_a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours_b, _ = cv2.findContours(gray_b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours_a or not contours_b:
            error_msg = "Could not find main shape in one or both images"
            print(error_msg)
            logging.info(error_msg)
            return False, error_msg

        mask_a = np.zeros_like(gray_a)
        mask_b = np.zeros_like(gray_b)
        main_contour_a = max(contours_a, key=cv2.contourArea)
        main_contour_b = max(contours_b, key=cv2.contourArea)
        cv2.drawContours(mask_a, [main_contour_a], -1, 255, thickness=cv2.FILLED)
        cv2.drawContours(mask_b, [main_contour_b], -1, 255, thickness=cv2.FILLED)

        img_a = cv2.bitwise_and(gray_a, gray_a, mask=mask_a)
        img_b = cv2.bitwise_and(gray_b, gray_b, mask=mask_b)

        if img_a.shape != img_b.shape:
            img_b = cv2.resize(img_b, (img_a.shape[1], img_a.shape[0]))

        ssim_score, _ = ssim(img_a, img_b, full=True, win_size=11)
        if ssim_score < threshold:
            error_msg = f"SSIM score {ssim_score:.3f} below threshold {threshold}"
            print(error_msg)
            logging.info(error_msg)
            return False, error_msg
        success_msg = f"SSIM score {ssim_score:.3f} above threshold"
        print(success_msg)
        logging.info(success_msg)
        return True, success_msg

    def calculate_expected_outline_color(self, json_data):
        """Calculate the expected outline color based on glyph_visuals.py logic."""
        source_data = json_data.get("source_data", {})
        temperature = json_data.get("environmental_context", {}).get("temperature_celsius", 0.0)
        deep_ricci_scalar = source_data.get("deep_ricci_scalar", 0.1)
        freq_match = source_data.get("frequency_match", 0.5)

        temp_norm = max(0, min(temperature / 30.0, 1.0))
        line_intensity = int(255 * temp_norm * (0.8 + 0.2 * deep_ricci_scalar) * (0.8 + 0.2 * freq_match))
        r = 129
        g = line_intensity
        b = 236
        log_message = (f"Expected outline color calculation: temp_norm={temp_norm}, line_intensity={line_intensity}, "
                       f"temperature={temperature}, deep_ricci_scalar={deep_ricci_scalar}, freq_match={freq_match}")
        print(log_message)
        logging.info(log_message)
        return (r, g, b)

    def verify_metadata_embedding(self, json_data, image_path, is_cairo=False):
        """Ensure key metrics (emotion, color, harmonic index) are encoded visually."""
        results = []

        primary_emotion = json_data["emotion_tags"]["primary_emotion"]
        expected_rgb = self.calculate_expected_outline_color(json_data)
        print(f"Expected outline color for {image_path}: RGB {expected_rgb}")
        logging.info(f"Expected outline color for {image_path}: RGB {expected_rgb}")

        dominant_colors = self.extract_emotion_palette(image_path, is_cairo, json_data)
        color_match = False
        for color in dominant_colors:
            if (abs(color[0] - expected_rgb[0]) < 120 and
                abs(color[1] - expected_rgb[1]) < 120 and
                abs(color[2] - expected_rgb[2]) < 120):
                color_match = True
                break
        if color_match:
            success_msg = "✅ Primary emotion color respected"
            results.append(success_msg)
            print(success_msg)
            logging.info(success_msg)
        else:
            error_msg = f"⚠️ Primary emotion color mismatch: expected outline color ~{expected_rgb}, found {dominant_colors}"
            results.append(error_msg)
            print(error_msg)
            logging.info(error_msg)

        chaos_signature = json_data["source_data"]["chaos_signature"]
        complexity_score = self.rate_entropy_complexity(image_path, is_cairo)
        variance = max(chaos_signature) - min(chaos_signature)
        expected_complexity = len(chaos_signature) * (0.5 + variance)
        if abs(complexity_score - expected_complexity) < 15:
            success_msg = "✅ Chaos variance reflected in complexity"
            results.append(success_msg)
            print(success_msg)
            logging.info(success_msg)
        else:
            error_msg = f"⚠️ Chaos complexity mismatch: expected {expected_complexity:.2f}, found {complexity_score:.2f}"
            results.append(error_msg)
            print(error_msg)
            logging.info(error_msg)

        observer_state = json_data["source_data"].get("observer_state", {})
        coherence = observer_state.get("coherence", 0.0)
        entanglement = observer_state.get("entanglement", 0.0)
        white_pixels = self.count_white_pixels(image_path, radius_range=(70, 80))
        expected_white = 0
        if coherence >= 0.05:
            expected_white += 500
        if entanglement >= 0.5:
            expected_white += 500
        if abs(white_pixels - expected_white) < 300:
            success_msg = "✅ Coherence/entanglement rings present"
            results.append(success_msg)
            print(success_msg)
            logging.info(success_msg)
        else:
            error_msg = f"⚠️ Coherence/entanglement rings mismatch: expected ~{expected_white} white pixels, found {white_pixels}"
            results.append(error_msg)
            print(error_msg)
            logging.info(error_msg)

        return results

    def render_grid_overlay(self, image_path, expected_points, output_path, is_cairo=False):
        """Overlay expected and actual points on the image for diagnostic purposes."""
        img = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(img)

        for x, y in expected_points:
            draw.ellipse((x-5, y-5, x+5, y+5), fill="green")

        actual_points = self.extract_image_points(image_path, is_cairo)
        for x, y in actual_points:
            draw.ellipse((x-3, y-3, x+3, y+3), fill="red")

        img.save(output_path)
        logging.info(f"Saved grid overlay to {output_path}")

    def extract_emotion_palette(self, image_path, is_cairo=False, json_data=None):
        """Extract dominant colors from the outline of the main shape."""
        img = cv2.imread(image_path)
        if img is None:
            print(f"Failed to load image: {image_path}")
            logging.info(f"Failed to load image: {image_path}")
            return []

        gray = self.preprocess_image_for_edges(img, is_cairo)
        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            print(f"No contours found in {image_path}")
            logging.info(f"No contours found in {image_path}")
            return []

        filtered_contours = [c for c in contours if 5000 < cv2.contourArea(c) < 500000]
        if not filtered_contours:
            print(f"No contours within area range in {image_path}")
            logging.info(f"No contours within area range in {image_path}")
            return []

        # Use the same contour selection logic as extract_image_points
        main_contour, _ = self.select_main_contour(filtered_contours, expected_points=11, image_path=image_path)
        if main_contour is None:
            return []

        mask = np.zeros_like(img)
        cv2.drawContours(mask, [main_contour], -1, (255, 255, 255), thickness=20)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.dilate(mask, kernel, iterations=5)

        masked_img = cv2.bitwise_and(img, mask)
        pixels = masked_img.reshape(-1, 3)
        pixels = pixels[np.any(pixels != [0, 0, 0], axis=1)]

        if len(pixels) == 0:
            print(f"No non-zero pixels after masking in {image_path}")
            logging.info(f"No non-zero pixels after masking in {image_path}")
            return []

        # Log raw pixels before filtering
        print(f"Raw pixels before filtering in {image_path}: {pixels[:10]} (first 10 pixels)")
        logging.info(f"Raw pixels before filtering in {image_path}: {pixels[:10]} (first 10 pixels)")

        background_rgb = np.array([68, 45, 45], dtype=np.uint8)
        phoenix_rgb = np.array([255, 111, 97], dtype=np.uint8)
        filtered_pixels = []
        for pixel in pixels:
            pixel = pixel.astype(np.uint8)
            if (abs(int(pixel[0]) - int(background_rgb[0])) < 100 and
                abs(int(pixel[1]) - int(background_rgb[1])) < 100 and
                abs(int(pixel[2]) - int(background_rgb[2])) < 100):
                print(f"Excluding pixel {pixel} as background in {image_path}")
                logging.info(f"Excluding pixel {pixel} as background in {image_path}")
                continue
            if (abs(int(pixel[0]) - int(phoenix_rgb[0])) < 60 and
                abs(int(pixel[1]) - int(phoenix_rgb[1])) < 60 and
                abs(int(pixel[2]) - int(phoenix_rgb[2])) < 60):
                print(f"Excluding pixel {pixel} as phoenix aura in {image_path}")
                logging.info(f"Excluding pixel {pixel} as phoenix aura in {image_path}")
                continue
            filtered_pixels.append(pixel)

        if not filtered_pixels:
            print(f"No pixels after filtering in {image_path}: pixels before filtering = {len(pixels)}")
            logging.info(f"No pixels after filtering in {image_path}: pixels before filtering = {len(pixels)}")
            return []

        filtered_pixels = np.array(filtered_pixels, dtype=np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 200, 0.1)
        _, labels, palette = cv2.kmeans(filtered_pixels, 1, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        palette = palette.astype(int)

        print(f"Detected colors in {image_path}: {palette}")
        logging.info(f"Detected colors in {image_path}: {palette}")
        return [tuple(color) for color in palette]

    def rate_entropy_complexity(self, image_path, is_cairo=False):
        """Score the visual complexity of the main shape using edge density and contour length."""
        img = cv2.imread(image_path)
        if img is None:
            print(f"Failed to load image for complexity scoring: {image_path}")
            logging.info(f"Failed to load image for complexity scoring: {image_path}")
            return 0.0

        gray = self.preprocess_image_for_edges(img, is_cairo)
        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            print(f"No contours found for complexity scoring in {image_path}")
            logging.info(f"No contours found for complexity scoring in {image_path}")
            return 0.0

        filtered_contours = [c for c in contours if 5000 < cv2.contourArea(c) < 500000]
        if not filtered_contours:
            print(f"No contours within area range for complexity scoring in {image_path}")
            logging.info(f"No contours within area range for complexity scoring in {image_path}")
            return 0.0

        main_contour = max(filtered_contours, key=cv2.contourArea)
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [main_contour], -1, 255, thickness=10)

        edges = cv2.Canny(mask, 30, 100)
        edge_density = np.sum(edges > 0) / (img.shape[0] * img.shape[1])

        total_length = cv2.arcLength(main_contour, True)
        max_length = 600 * 4
        length_score = total_length / max_length

        complexity = (edge_density * 50 + length_score * 50)
        if is_cairo:
            complexity *= 0.5

        return complexity

    def count_white_pixels(self, image_path, radius_range=None):
        """Count near-white pixels in the specified region (for rings/glow detection)."""
        img = cv2.imread(image_path)
        if img is None:
            print(f"Failed to load image for white pixel counting: {image_path}")
            logging.info(f"Failed to load image for white pixel counting: {image_path}")
            return 0

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lower_white = np.array([0, 0, 230])
        upper_white = np.array([180, 20, 255])
        mask = cv2.inRange(hsv, lower_white, upper_white)

        if radius_range:
            center_x, center_y = img.shape[1] // 2, img.shape[0] // 2
            radius_mask = np.zeros_like(mask)
            cv2.circle(radius_mask, (center_x, center_y), radius_range[1], 255, -1)
            cv2.circle(radius_mask, (center_x, center_y), radius_range[0], 0, -1)
            mask = cv2.bitwise_and(mask, radius_mask)

        white_pixel_count = np.sum(mask > 0)
        logging.info(f"White pixel count in {image_path}: {white_pixel_count}")
        return white_pixel_count

    def validate_glyph(self, glyph_id, style="A"):
        """Run all validation checks on a glyph and produce a report."""
        self.validation_report = {}
        self.validation_status = None

        json_path = os.path.join(self.glyph_dir, f"{glyph_id}.json")
        if not os.path.exists(json_path):
            self.validation_report["error"] = f"JSON file not found: {json_path}"
            self.validation_status = "❌"
            print(self.validation_report["error"])
            logging.info(self.validation_report["error"])
            return self.validation_report

        with open(json_path, 'r') as f:
            json_data = json.load(f)

        image_path = os.path.join(self.glyph_dir, f"{glyph_id}-{style}.png")
        if not os.path.exists(image_path):
            self.validation_report["error"] = f"Image file not found: {image_path}"
            self.validation_status = "❌"
            print(self.validation_report["error"])
            logging.info(self.validation_report["error"])
            return self.validation_report

        is_cairo = (style == "B")

        chaos_signature = json_data["source_data"]["chaos_signature"]
        expected_points = self.trace_chaos_to_points(chaos_signature, radius=120, angle_offset=0, size=600)
        actual_points = self.extract_image_points(image_path, is_cairo)
        trace_result, trace_message = self.compare_points(expected_points, actual_points)
        self.validation_report["chaos_trace"] = {
            "success": trace_result,
            "message": trace_message
        }

        image_b_path = os.path.join(self.glyph_dir, f"{glyph_id}-B.png") if style == "A" else os.path.join(self.glyph_dir, f"{glyph_id}-A.png")
        if os.path.exists(image_b_path):
            drift_result, drift_message = self.compare_visual_forms(image_path, image_b_path, threshold=0.65)
            self.validation_report["visual_drift"] = {
                "success": drift_result,
                "message": drift_message
            }
        else:
            self.validation_report["visual_drift"] = {
                "success": False,
                "message": "Comparison image not found"
            }
            print(self.validation_report["visual_drift"]["message"])
            logging.info(self.validation_report["visual_drift"]["message"])

        metadata_results = self.verify_metadata_embedding(json_data, image_path, is_cairo)
        self.validation_report["metadata_alignment"] = metadata_results

        if not trace_result or not self.validation_report["visual_drift"]["success"]:
            self.validation_status = "❌"
            self.validation_report["summary"] = "Visual divergence — do not train AI on this glyph"
        elif any("⚠️" in result for result in metadata_results):
            self.validation_status = "⚠️"
            self.validation_report["summary"] = "Visual mismatch — needs review"
        else:
            self.validation_status = "✅"
            self.validation_report["summary"] = "Visual aligned to data"

        print(f"SigilSync validation for Style {style} ({os.path.basename(image_path)}): {self.validation_report}")
        logging.info(f"SigilSync validation for Style {style} ({os.path.basename(image_path)}): {self.validation_report}")

        verified_json_path = os.path.join(self.glyph_dir, f"{glyph_id}-verified.json")
        with open(verified_json_path, 'w') as f:
            json.dump({
                "glyph_id": glyph_id,
                "style": style,
                "validation_status": self.validation_status,
                "validation_report": self.validation_report
            }, f, indent=2)
        logging.info(f"Saved validation report to {verified_json_path}")

        overlay_path = os.path.join(self.glyph_dir, f"{glyph_id}-{style}-overlay.png")
        self.render_grid_overlay(image_path, expected_points, overlay_path, is_cairo)

        return self.validation_report