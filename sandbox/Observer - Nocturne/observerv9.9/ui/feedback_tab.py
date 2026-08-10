from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTextEdit, QPushButton

class FeedbackTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Observer State
        self.observer_state_label = QLabel("Coherence: 0.00 | Entanglement: 0.00")
        layout.addWidget(self.observer_state_label)

        # Pulse Proxy
        self.pulse_label = QLabel("Pulse Proxy: 0.00000")
        layout.addWidget(self.pulse_label)

        # Harmonic Index
        self.harmonic_index_label = QLabel("Harmonic Index: 0.00")
        layout.addWidget(self.harmonic_index_label)

        # Log Display
        self.log_display = QTextEdit()
        self.log_display.setReadOnly(True)
        self.log_display.setFixedHeight(150)
        layout.addWidget(QLabel("Log:"))
        layout.addWidget(self.log_display)

        # ChatGPT Feedback
        self.response_field = QTextEdit()
        # Remove setReadOnly(True) to allow editing
        self.response_field.setFixedHeight(150)
        layout.addWidget(QLabel("Feedback Response:"))
        layout.addWidget(self.response_field)

        # Buttons
        buttons_layout = QHBoxLayout()
        self.mock_button = QPushButton("Mock ChatGPT Feedback")
        self.mock_button.clicked.connect(self.mock_chatgpt_feedback)
        buttons_layout.addWidget(self.mock_button)

        self.apply_button = QPushButton("Apply ChatGPT Feedback")
        self.apply_button.clicked.connect(self.apply_chatgpt_feedback)
        buttons_layout.addWidget(self.apply_button)

        layout.addLayout(buttons_layout)

    def mock_chatgpt_feedback(self):
        self.core.mock_chatgpt_response()

    def apply_chatgpt_feedback(self):
        response_text = self.response_field.toPlainText()
        if response_text:
            self.core.process_chatgpt_response(response_text)
        else:
            self.response_field.setPlainText("No feedback to apply.")

    def update_ui_elements(self, elements):
        pass