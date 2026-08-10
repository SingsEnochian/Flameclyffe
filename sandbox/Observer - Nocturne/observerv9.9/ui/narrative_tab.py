from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton, QLabel, QApplication
)

class NarrativeTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Portal Narrative
        layout.addWidget(QLabel("Portal Narrative:"))
        self.narrative_display = QTextEdit()
        self.narrative_display.setReadOnly(False)
        self.narrative_display.setFixedSize(700, 240)
        self.narrative_display.setStyleSheet("background-color: #2d2d44; color: #E6E6FA;")
        layout.addWidget(self.narrative_display)

        # Narrative Controls
        self.narrative_controls = QWidget()
        controls_layout = QHBoxLayout(self.narrative_controls)
        self.clear_narrative_button = QPushButton("Clear Narrative")
        self.clear_narrative_button.setStyleSheet("background-color: #ff7675; color: black; padding: 5px;")
        self.clear_narrative_button.clicked.connect(lambda: self.narrative_display.clear())
        controls_layout.addWidget(self.clear_narrative_button)

        self.copy_narrative_button = QPushButton("Copy Narrative")
        self.copy_narrative_button.setStyleSheet("background-color: #a29bfe; color: black; padding: 5px;")
        self.copy_narrative_button.clicked.connect(self.copy_narrative)
        controls_layout.addWidget(self.copy_narrative_button)

        self.reflect_button = QPushButton("Reflect on Journey")
        self.reflect_button.setStyleSheet("background-color: #00cec9; color: black; padding: 5px;")
        self.reflect_button.clicked.connect(self.core.reflect_on_journey)
        controls_layout.addWidget(self.reflect_button)

        layout.addWidget(self.narrative_controls)

        # Narrative History
        layout.addWidget(QLabel("Narrative History:"))
        self.narrative_history_display = QTextEdit()
        self.narrative_history_display.setReadOnly(True)
        self.narrative_history_display.setFixedSize(700, 240)
        self.narrative_history_display.setStyleSheet("background-color: #2d2d44; color: #E6E6FA;")
        layout.addWidget(self.narrative_history_display)

    def copy_narrative(self):
        try:
            clipboard = QApplication.clipboard()
            clipboard.setText(self.narrative_display.toPlainText())
            print("Narrative copied to clipboard successfully.")
        except Exception as e:
            print(f"Failed to copy narrative to clipboard: {e}")

    def update_ui_elements(self, elements):
        if "narrative_display" in elements:
            self.narrative_display.setText(elements["narrative_display"])
        if "narrative_history_display" in elements:
            self.narrative_history_display.setText(elements["narrative_history_display"])