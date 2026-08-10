from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox, QPushButton, QListWidget, QListWidgetItem, QTextEdit

class RitualsTab(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Ritual Selection
        self.ritual_dropdown = QComboBox()
        # Dynamically load rituals from the ritual_manager
        rituals = self.core.ritual_manager.load_rituals()
        ritual_names = [ritual["name"] for ritual in rituals]
        print(f"Loaded {len(ritual_names)} rituals for dropdown: {ritual_names}")
        self.ritual_dropdown.addItems(ritual_names if ritual_names else ["No rituals available"])
        self.ritual_dropdown.setFixedWidth(300)
        layout.addWidget(QLabel("Select Ritual:"))
        layout.addWidget(self.ritual_dropdown)

        # Ritual Name
        self.name_field = QLineEdit()
        self.name_field.setFixedWidth(300)
        layout.addWidget(QLabel("Ritual Name:"))
        layout.addWidget(self.name_field)

        # Ritual Type
        self.type_field = QLineEdit()
        self.type_field.setFixedWidth(300)
        layout.addWidget(QLabel("Ritual Type:"))
        layout.addWidget(self.type_field)

        # Participants
        self.participants_field = QLineEdit()
        self.participants_field.setFixedWidth(300)
        layout.addWidget(QLabel("Participants (comma-separated):"))
        layout.addWidget(self.participants_field)

        # Emotions Listbox
        self.emotions_listbox = QListWidget()
        self.emotions_listbox.setSelectionMode(QListWidget.MultiSelection)
        for emotion in self.core.config["emotions"]:
            item = QListWidgetItem(emotion)
            self.emotions_listbox.addItem(item)
        layout.addWidget(QLabel("Select Emotions:"))
        layout.addWidget(self.emotions_listbox)

        # Location
        self.location_field = QLineEdit()
        self.location_field.setFixedWidth(300)
        layout.addWidget(QLabel("Location:"))
        layout.addWidget(self.location_field)

        # Narrative
        self.narrative_field = QLineEdit()
        self.narrative_field.setFixedWidth(300)
        layout.addWidget(QLabel("Narrative:"))
        layout.addWidget(self.narrative_field)

        # Entanglement Boost
        self.entanglement_boost_field = QLineEdit()
        self.entanglement_boost_field.setFixedWidth(300)
        layout.addWidget(QLabel("Entanglement Boost:"))
        layout.addWidget(self.entanglement_boost_field)

        # Coherence Floor
        self.coherence_floor_field = QLineEdit()
        self.coherence_floor_field.setFixedWidth(300)
        layout.addWidget(QLabel("Coherence Floor:"))
        layout.addWidget(self.coherence_floor_field)

        # Visual Color
        self.visual_color_field = QLineEdit()
        self.visual_color_field.setFixedWidth(300)
        layout.addWidget(QLabel("Visual Color (hex):"))
        layout.addWidget(self.visual_color_field)

        # Bind Button
        self.bind_button = QPushButton("Bind New Ritual")
        self.bind_button.clicked.connect(self.bind_ritual)
        layout.addWidget(self.bind_button)

        # Ritual Linkages Display
        self.linkages_display = QTextEdit()
        self.linkages_display.setReadOnly(True)
        self.linkages_display.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
        layout.addWidget(QLabel("Glyph-Ritual Linkages:"))
        layout.addWidget(self.linkages_display)

        # Refresh Linkages Button
        self.refresh_linkages_button = QPushButton("Refresh Linkages")
        self.refresh_linkages_button.clicked.connect(self.refresh_linkages)
        layout.addWidget(self.refresh_linkages_button)

        # Initial refresh
        self.refresh_linkages()

    def bind_ritual(self):
        name = self.name_field.text()
        ritual_type = self.type_field.text()
        participants = self.participants_field.text().split(",")
        emotions = [self.emotions_listbox.item(i).text() for i in range(self.emotions_listbox.count()) if self.emotions_listbox.item(i).isSelected()]
        location = self.location_field.text()
        narrative = self.narrative_field.text()
        entanglement_boost = float(self.entanglement_boost_field.text() or 0)
        coherence_floor = float(self.coherence_floor_field.text() or 0)
        visual_color = self.visual_color_field.text()

        success, message = self.core.bind_new_ritual(
            name, ritual_type, participants, emotions, location, narrative,
            entanglement_boost, coherence_floor, visual_color
        )
        if success:
            # Refresh the dropdown with the new ritual
            self.ritual_dropdown.clear()
            rituals = self.core.ritual_manager.load_rituals()
            ritual_names = [ritual["name"] for ritual in rituals]
            self.ritual_dropdown.addItems(ritual_names if ritual_names else ["No rituals available"])
            print(f"Updated ritual dropdown with {len(ritual_names)} rituals: {ritual_names}")
            # Refresh linkages display
            self.refresh_linkages()
        else:
            print(f"Error binding ritual: {message}")

    def refresh_linkages(self):
        linkages = self.core.ritual_manager.ritual_linkages
        if not linkages:
            self.linkages_display.setPlainText("No glyph-ritual linkages found.")
            return
        display_text = "\n".join([f"Glyph: {glyph_id} -> Ritual: {ritual_name}" for glyph_id, ritual_name in linkages.items()])
        self.linkages_display.setPlainText(display_text)

    def update_ui_elements(self, elements):
        pass