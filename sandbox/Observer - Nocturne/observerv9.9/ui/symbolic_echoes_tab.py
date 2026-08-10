from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QTextEdit, QPushButton, QLineEdit
import os
import json
import statistics
import random

class SymbolicEchoesTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.filtered_pulse_orbs = self.core.pulse_orbs  # Initialize with all pulse orbs
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Emotional Signature Filter
        self.emotion_dropdown = QComboBox()
        self.emotion_dropdown.addItem("All Emotions")
        self.emotion_dropdown.addItems(self.core.config["emotions"])
        self.emotion_dropdown.setFixedWidth(300)
        self.emotion_dropdown.currentTextChanged.connect(self.filter_glyphs)
        layout.addWidget(QLabel("Emotional Signature:"))
        layout.addWidget(self.emotion_dropdown)

        # Display Area for Filtered Glyphs
        self.display_area = QTextEdit()
        self.display_area.setReadOnly(True)
        self.display_area.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
        layout.addWidget(QLabel("Filtered Glyphs:"))
        layout.addWidget(self.display_area)

        # Chaos Patterns Field
        self.chaos_pattern_field = QLineEdit()
        self.chaos_pattern_field.setFixedWidth(300)
        layout.addWidget(QLabel("Chaos Patterns:"))
        layout.addWidget(self.chaos_pattern_field)

        # Echo Intensity Field
        self.echo_intensity_field = QLineEdit()
        self.echo_intensity_field.setFixedWidth(300)
        layout.addWidget(QLabel("Echo Intensity:"))
        layout.addWidget(self.echo_intensity_field)

        # Narrative Resonance Field
        self.narrative_resonance_field = QLineEdit()
        self.narrative_resonance_field.setFixedWidth(300)
        layout.addWidget(QLabel("Narrative Resonance:"))
        layout.addWidget(self.narrative_resonance_field)

        # Analyze Echoes Button
        self.analyze_button = QPushButton("Analyze Echoes")
        self.analyze_button.clicked.connect(self.analyze_echoes)
        layout.addWidget(self.analyze_button)

        # Display initial glyphs
        self.display_filtered_glyphs(self.filtered_pulse_orbs)

    def filter_glyphs(self):
        emotion = self.emotion_dropdown.currentText()
        if emotion == "All Emotions":
            self.core.filter_glyphs_by_emotion("")  # Reset filter to show all glyphs
        else:
            self.core.filter_glyphs_by_emotion(emotion)

    def display_filtered_glyphs(self, filtered_pulse_orbs):
        """Display the filtered glyphs in the text area."""
        self.filtered_pulse_orbs = filtered_pulse_orbs
        if not self.filtered_pulse_orbs:
            self.display_area.setPlainText("No glyphs match the selected emotion.")
            return

        display_text = ""
        for orb in self.filtered_pulse_orbs:
            glyph_id = orb.get("glyph_id", "Unknown")
            tags = orb.get("tags", [])
            display_text += f"Glyph: {glyph_id}\nEmotions: {', '.join(tags)}\n\n"
        self.display_area.setPlainText(display_text)

    def analyze_echoes(self):
        if not self.filtered_pulse_orbs:
            self.display_area.setPlainText("No glyphs available for analysis.")
            return

        # Collect chaos signatures from filtered glyphs
        chaos_signatures = []
        for orb in self.filtered_pulse_orbs:
            glyph_id = orb.get("glyph_id", "Unknown")
            glyph_json_path = os.path.join(self.core.config["GLYPH_DIR"], f"{glyph_id}.json")
            try:
                with open(glyph_json_path, 'r') as f:
                    glyph_data = json.load(f)
                chaos = glyph_data["source_data"].get("chaos_signature", [])
                if chaos:
                    chaos_signatures.append(chaos)
            except Exception as e:
                print(f"Error loading chaos signature for {glyph_id}: {e}")
                continue

        if not chaos_signatures:
            self.display_area.setPlainText("No chaos signatures available for analysis.")
            return

        # Analyze chaos patterns (calculate variance across signatures)
        chaos_lengths = [len(cs) for cs in chaos_signatures]
        if not all(length == chaos_lengths[0] for length in chaos_lengths):
            self.display_area.setPlainText("Chaos signatures have inconsistent lengths.")
            return

        # Calculate variance for each position in the chaos signature
        variances = []
        for i in range(chaos_lengths[0]):
            values_at_position = [cs[i] for cs in chaos_signatures]
            variance = statistics.variance(values_at_position)
            variances.append(variance)
        avg_variance = sum(variances) / len(variances)

        # Get user inputs
        chaos_pattern = self.chaos_pattern_field.text()
        echo_intensity_input = self.echo_intensity_field.text()
        narrative_resonance = self.narrative_resonance_field.text()

        # Process echo intensity (default to 1.0 if not specified or invalid)
        try:
            echo_intensity = float(echo_intensity_input) if echo_intensity_input else 1.0
            echo_intensity = max(0.1, min(echo_intensity, 10.0))  # Clamp between 0.1 and 10.0
        except ValueError:
            echo_intensity = 1.0

        # Calculate resonance strength (scaled by echo intensity)
        resonance_strength = (1.0 - avg_variance) * echo_intensity  # Lower variance = higher resonance
        resonance_strength = max(0.0, min(resonance_strength, 10.0))

        # Generate narrative interpretation
        narrative = narrative_resonance if narrative_resonance else "A subtle ripple in the cosmic weave"
        emotions = set()
        for orb in self.filtered_pulse_orbs:
            emotions.update(orb.get("tags", []))
        emotion_str = ", ".join(emotions) if emotions else "unknown energies"
        narrative_interpretation = (
            f"The glyphs resonate with {emotion_str}, amplifying the theme: '{narrative}'. "
            f"Their collective energy suggests a {resonance_strength:.2f}x influence on Equestria, "
            f"potentially manifesting as a {random.choice(['harmonic festival', 'mystical storm', 'community gathering'])}."
        )

        # Compile analysis output
        display_text = (
            "Symbolic Echoes Analysis\n\n"
            f"Number of Glyphs Analyzed: {len(chaos_signatures)}\n"
            f"Chaos Patterns: {chaos_pattern or 'Not specified'}\n"
            f"Average Chaos Variance: {avg_variance:.4f} (lower = more stable)\n"
            f"Echo Intensity: {echo_intensity:.2f}\n"
            f"Resonance Strength: {resonance_strength:.2f}x\n"
            f"Narrative Resonance: {narrative}\n\n"
            f"Interpretation:\n{narrative_interpretation}"
        )
        self.display_area.setPlainText(display_text)

    def update_ui_elements(self, elements):
        """Handle UI updates from UIUpdater. Currently, SymbolicEchoesTab doesn't need to process any updates."""
        print(f"SymbolicEchoesTab: Received UI update elements: {elements}")
        # No action needed for now, but method is required for compatibility with UIUpdater
        pass