from PyQt5.QtWidgets import QWidget, QVBoxLayout, QTextEdit, QPushButton, QLabel

class HistoryTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Observer History
        layout.addWidget(QLabel("Observer History:"))
        self.history_display = QTextEdit()
        self.history_display.setReadOnly(True)
        self.history_display.setFixedSize(700, 320)
        self.history_display.setStyleSheet("background-color: #2d2d44; color: white;")
        layout.addWidget(self.history_display)

        # View Narrative Log Button
        self.view_narratives_button = QPushButton("View Narrative Log")
        self.view_narratives_button.setStyleSheet("background-color: #a29bfe; color: black; padding: 5px;")
        self.view_narratives_button.clicked.connect(self.core.show_narrative_log)
        layout.addWidget(self.view_narratives_button)

    def update_ui_elements(self, elements):
        if "history_display" in elements:
            self.history_display.setText(elements["history_display"])