import os
import json
from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QCheckBox, QScrollArea, QSlider
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPixmap

class Sidebar(QWidget):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Filter by Emotions
        self.filter_frame = QWidget()
        filter_layout = QVBoxLayout(self.filter_frame)
        filter_layout.addWidget(QLabel("Filter by Emotions"))
        self.filter_vars = {}
        for emotion in self.core.config["emotions"]:
            var = QCheckBox(emotion)
            var.setStyleSheet("color: #ffffff; font-size: 14px;")
            var.stateChanged.connect(self.refresh_gallery)
            filter_layout.addWidget(var)
            self.filter_vars[emotion] = var
        layout.addWidget(self.filter_frame)

        # Glyph Gallery
        self.gallery_container = QWidget()
        gallery_layout = QVBoxLayout(self.gallery_container)
        gallery_layout.addWidget(QLabel("🖼 Glyph Gallery"))
        self.gallery_scroll = QScrollArea()
        self.gallery_inner = QWidget()
        # Add compatibility method for Tkinter's winfo_children
        self.gallery_inner.winfo_children = self.gallery_inner.children
        self.gallery_inner_layout = QVBoxLayout(self.gallery_inner)
        # Add compatibility method for Tkinter's destroy after layout is created
        def destroy():
            while self.gallery_inner_layout.count():
                item = self.gallery_inner_layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
        self.gallery_inner_layout.destroy = destroy
        self.gallery_inner.destroy = destroy
        self.gallery_scroll.setWidget(self.gallery_inner)
        self.gallery_scroll.setWidgetResizable(True)
        self.gallery_scroll.setFixedWidth(300)
        gallery_layout.addWidget(self.gallery_scroll)
        layout.addWidget(self.gallery_container)

        # Timeline Navigator
        self.timeline_frame = QWidget()
        timeline_layout = QVBoxLayout(self.timeline_frame)
        timeline_layout.addWidget(QLabel("Timeline Navigator"))
        self.timeline_scale = QSlider(Qt.Horizontal)
        self.timeline_scale.setRange(0, 0)
        self.timeline_scale.setFixedWidth(180)
        self.timeline_scale.setStyleSheet("background-color: #3c3f41; color: #ffffff;")
        self.timeline_scale.valueChanged.connect(self.core.ui_updater.handle_timeline_scroll)
        timeline_layout.addWidget(self.timeline_scale)
        self.sidebar_threshold_banner = QLabel("✶ Threshold One Achieved ✶")
        self.sidebar_threshold_banner.setStyleSheet("background-color: #2d2d44; color: " + self.core.config["glow_color"] + "; padding: 4px;")
        timeline_layout.addWidget(self.sidebar_threshold_banner)
        layout.addWidget(self.timeline_frame)

        # Initial refresh of the gallery
        self.refresh_gallery()

    def refresh_gallery(self):
        # Clear current gallery content
        while self.gallery_inner_layout.count():
            item = self.gallery_inner_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # Get filtered emotions
        selected_emotions = [emotion for emotion, var in self.filter_vars.items() if var.isChecked()]
        pulse_orbs = self.core.pulse_orbs

        # Filter glyphs based on emotions
        glyphs = []
        for orb in pulse_orbs:
            glyph_id = orb.get("glyph_id")
            tags = orb.get("tags", [])
            if not selected_emotions or any(tag in selected_emotions for tag in tags):
                glyphs.append({"glyph_id": glyph_id if glyph_id else "None", "tags": tags})

        # Debug: Log the number of glyphs to display
        print(f"Glyphs to display in gallery: {len(glyphs)}")

        # Update the timeline slider range based on the number of glyphs
        if glyphs:
            self.timeline_scale.setRange(0, len(glyphs) - 1)
            self.core.ui_updater.set_glyph_list(glyphs)
        else:
            self.timeline_scale.setRange(0, 0)

        # Display glyphs
        if not glyphs:
            self.gallery_inner_layout.addWidget(QLabel("No glyphs to display"))
        else:
            for glyph in glyphs:
                # Create a widget to hold both the image and the label
                glyph_container = QWidget()
                glyph_layout = QVBoxLayout(glyph_container)

                # Load and display the glyph image (A or B based on selected style)
                glyph_id = glyph['glyph_id']
                glyph_json_path = os.path.join(self.core.config["GLYPH_DIR"], f"{glyph_id}.json")
                glyph_path = "unknown"
                try:
                    if not os.path.exists(glyph_json_path):
                        raise FileNotFoundError(f"Glyph JSON file not found: {glyph_json_path}")
                    with open(glyph_json_path, 'r') as f:
                        glyph_data = json.load(f)
                    # Check for visual_artifact_a/b (new format) or visual_artifact (old format)
                    if "visual_artifact_a" in glyph_data and "visual_artifact_b" in glyph_data:
                        artifact_key = "visual_artifact_a" if self.core.glyph_style == "A" else "visual_artifact_b"
                        glyph_filename = glyph_data.get(artifact_key, f"{glyph_id}-A.png")
                    else:
                        # Fallback for older glyphs
                        glyph_filename = glyph_data.get("visual_artifact", f"{glyph_id}.png")
                    glyph_path = os.path.join(self.core.config["GLYPH_DIR"], glyph_filename)
                    print(f"Attempting to load glyph image: {glyph_path}")
                    if not os.path.exists(glyph_path):
                        raise FileNotFoundError(f"Glyph image file not found: {glyph_path}")
                    pixmap = QPixmap(glyph_path)
                    if pixmap.isNull():
                        print(f"Pixmap is null for {glyph_path}. File exists: {os.path.exists(glyph_path)}, File size: {os.path.getsize(glyph_path) if os.path.exists(glyph_path) else 'N/A'} bytes")
                        raise FileNotFoundError("Pixmap is null")
                    # Scale the image to thumbnail size (e.g., 50x50)
                    pixmap = pixmap.scaled(50, 50, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                    image_label = QLabel()
                    image_label.setPixmap(pixmap)
                    image_label.setAlignment(Qt.AlignCenter)
                    glyph_layout.addWidget(image_label)
                except Exception as e:
                    print(f"Error loading glyph image for {glyph_id}: {e}")
                    continue  # Skip this glyph to prevent displaying incomplete entries

                # Add a label for glyph_id and tags
                text_label = QLabel(f"Glyph: {glyph['glyph_id']} ({', '.join(glyph['tags'])})")
                text_label.setStyleSheet("color: white; padding: 5px; border: 1px solid #555;")
                text_label.setAlignment(Qt.AlignCenter)
                text_label.setWordWrap(True)
                glyph_layout.addWidget(text_label)

                # Set up click event for the entire container
                glyph_container.setStyleSheet("border: none;")
                glyph_container.setCursor(Qt.PointingHandCursor)
                glyph_container.mousePressEvent = lambda event, gid=glyph['glyph_id']: self.open_glyph_modal(gid)

                self.gallery_inner_layout.addWidget(glyph_container)

    def open_glyph_modal(self, glyph_id):
        if glyph_id and glyph_id != "None":
            # Load the JSON to determine the correct image variant
            json_path = os.path.join(self.core.config["GLYPH_DIR"], f"{glyph_id}.json")
            try:
                with open(json_path, 'r') as f:
                    glyph_data = json.load(f)
                artifact_key = "visual_artifact_a" if self.core.glyph_style == "A" else "visual_artifact_b"
                glyph_filename = glyph_data.get(artifact_key) or glyph_data.get("visual_artifact", f"{glyph_id}-A.png")
                glyph_path = os.path.join(self.core.config["GLYPH_DIR"], glyph_filename)
                self.core.ui_updater.open_glyph_modal(glyph_path)
            except Exception as e:
                print(f"Error determining glyph image path for {glyph_id}: {e}")
        else:
            print("No glyph ID to open modal for.")