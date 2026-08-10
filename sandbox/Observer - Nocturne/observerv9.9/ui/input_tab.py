from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QTextEdit, QPushButton, QListWidget, QListWidgetItem, QComboBox
from PyQt5.QtCore import Qt

class InputTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.current_glyph_id = None
        self.current_ritual_name = None
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Glyph Style Selector
        self.style_dropdown = QComboBox()
        self.style_dropdown.addItems(["Style A (Pillow)", "Style B (Cairo)"])
        self.style_dropdown.setFixedWidth(300)
        self.style_dropdown.currentTextChanged.connect(self.on_style_changed)
        layout.addWidget(QLabel("Glyph Style:"))
        layout.addWidget(self.style_dropdown)

        # Input Field
        self.input_field = QLineEdit()
        self.input_field.setFixedWidth(300)
        layout.addWidget(QLabel("Manual Input Description:"))
        layout.addWidget(self.input_field)

        # Target Dimension
        self.target_field = QLineEdit()
        self.target_field.setText("Equestria")
        self.target_field.setFixedWidth(300)
        layout.addWidget(QLabel("Target Dimension:"))
        layout.addWidget(self.target_field)

        # Value Field
        # Note: 'value' is not currently used in glyph drawing calculations but is retained for future use
        self.value_field = QLineEdit()
        self.value_field.setFixedWidth(300)
        layout.addWidget(QLabel("Value:"))
        layout.addWidget(self.value_field)

        # Notes Field
        self.notes_field = QLineEdit()
        self.notes_field.setFixedWidth(300)
        layout.addWidget(QLabel("Notes:"))
        layout.addWidget(self.notes_field)

        # Emotions Listbox
        self.emotion_listbox = QListWidget()
        self.emotion_listbox.setSelectionMode(QListWidget.MultiSelection)
        for emotion in self.core.config["emotions"]:
            item = QListWidgetItem(emotion)
            self.emotion_listbox.addItem(item)
        layout.addWidget(QLabel("Select Emotions:"))
        layout.addWidget(self.emotion_listbox)

        # Narrative Intention
        self.narrative_intention_field = QTextEdit()
        self.narrative_intention_field.setFixedHeight(60)
        layout.addWidget(QLabel("Narrative Intention (Optional):"))
        layout.addWidget(self.narrative_intention_field)

        # Cast Button
        self.cast_button = QPushButton("Cast Resonance")
        self.cast_button.clicked.connect(self.core.full_cast)
        layout.addWidget(self.cast_button)

        # Confirmation Label
        self.confirmation = QLabel("")
        layout.addWidget(self.confirmation)

        # Narrative Infusion Display
        self.narrative_infusion = QLabel("")
        layout.addWidget(self.narrative_infusion)

        # ETF Suggestion
        self.etf_label = QLabel("")
        layout.addWidget(self.etf_label)

        self.etf_bind_button = QPushButton("Bind to Ritual")
        self.etf_bind_button.setVisible(False)
        # Add initial logging to confirm signal connection
        self.etf_bind_button.clicked.connect(self.bind_to_ritual)
        print("Bind to Ritual button signal connected in init_ui")
        layout.addWidget(self.etf_bind_button)

    def on_style_changed(self, style_text):
        """Handle glyph style selection."""
        style = "A" if "Pillow" in style_text else "B"
        self.core.set_glyph_style(style)

    def visualize_chaos_on_canvas(self, chaos, env_data, primary_emotion):
        # Placeholder for visualizing chaos data; in Tkinter, this drew on a canvas
        print(f"Visualizing chaos on canvas with args: {chaos}, {env_data}, {primary_emotion}")

    def update_ui_elements(self, elements):
        print(f"Updating UI elements with: {elements}")
        for element_name, value in elements.items():
            if element_name == "confirmation":
                self.confirmation.setText(value)
            elif element_name == "narrative_infusion":
                self.narrative_infusion.setText(value)
            elif element_name == "etf_label":
                self.etf_label.setText(value)
            elif element_name == "etf_suggestion":
                if value is not None:  # Only process if etf_suggestion is explicitly provided
                    if value:
                        self.current_glyph_id = value["glyph_id"]
                        self.current_ritual_name = value["ritual_name"]
                        self.etf_label.setText(f"Entanglement Trigger Detected: Suggest binding {self.current_glyph_id} to {self.current_ritual_name}")
                        self.etf_bind_button.setVisible(True)
                        print(f"ETF suggestion set: glyph_id={self.current_glyph_id}, ritual_name={self.current_ritual_name}")
                    else:
                        print(f"ETF suggestion cleared: Previous glyph_id={self.current_glyph_id}, ritual_name={self.current_ritual_name}")
                        self.current_glyph_id = None
                        self.current_ritual_name = None
                        self.etf_label.setText("")
                        self.etf_bind_button.setVisible(False)
            elif element_name == "canvas_chaos":
                self.visualize_chaos_on_canvas(*value)

    def bind_to_ritual(self):
        """Handle the binding action when the Bind to Ritual button is clicked."""
        print(f"Bind to Ritual button clicked: Current glyph_id={self.current_glyph_id}, ritual_name={self.current_ritual_name}")
        if self.current_glyph_id and self.current_ritual_name:
            print(f"Binding glyph {self.current_glyph_id} to ritual {self.current_ritual_name}")
            self.core.bind_glyph_to_suggested_ritual(self.current_glyph_id, self.current_ritual_name)
            self.confirmation.setText(f"Glyph {self.current_glyph_id} successfully bound to {self.current_ritual_name}!")
        else:
            print("Error: No glyph_id or ritual_name available for binding")
            self.confirmation.setText("Error: Unable to bind glyph to ritual.")