import os
import json
from PyQt5.QtWidgets import QDialog, QVBoxLayout, QLabel, QTextEdit
from PyQt5.QtGui import QPixmap
from PyQt5.QtCore import Qt

class UIUpdater:
    def __init__(self, config):
        self.config = config
        self.ui = None
        self.thumbnail_cache = {}
        self.glyph_list = []  # Store the list of glyphs for timeline navigation
        self.timeline_dialog = None  # Store the dialog for timeline navigation

    def set_ui(self, ui):
        self.ui = ui

    def set_glyph_list(self, glyph_list):
        """Store the list of glyphs for timeline navigation."""
        self.glyph_list = glyph_list
        print(f"Updated glyph list for timeline navigation: {len(self.glyph_list)} glyphs")

    def update_ui(self, elements):
        print(f"UIUpdater: Updating UI with elements: {elements}")
        if not self.ui:
            print("UIUpdater: No UI instance set, cannot update UI")
            return
        try:
            if hasattr(self.ui, "input_tab"):
                print("UIUpdater: Updating input_tab")
                self.ui.input_tab.update_ui_elements(elements)
            if hasattr(self.ui, "feedback_tab"):
                print("UIUpdater: Updating feedback_tab")
                self.ui.feedback_tab.update_ui_elements(elements)
            if hasattr(self.ui, "narrative_tab"):
                print("UIUpdater: Updating narrative_tab")
                self.ui.narrative_tab.update_ui_elements(elements)
            if hasattr(self.ui, "history_tab"):
                print("UIUpdater: Updating history_tab")
                self.ui.history_tab.update_ui_elements(elements)
            if hasattr(self.ui, "rituals_tab"):
                print("UIUpdater: Updating rituals_tab")
                self.ui.rituals_tab.update_ui_elements(elements)
            if hasattr(self.ui, "symbolic_echoes_tab"):
                print("UIUpdater: Updating symbolic_echoes_tab")
                self.ui.symbolic_echoes_tab.update_ui_elements(elements)
        except Exception as e:
            print(f"UIUpdater: Error updating UI: {e}")

    def refresh_log(self):
        print("Refreshing log display")
        self.ui.log_display.setPlainText("Log refreshed.\n")

    def refresh_history(self):
        history_log_file = "observer_history.json"
        print(f"Refreshing history from {history_log_file}")
        try:
            if os.path.exists(history_log_file):
                with open(history_log_file, 'r') as f:
                    observer_history = json.load(f)
                if isinstance(observer_history, list):
                    history_text = ""
                    for entry in observer_history:
                        # Handle PyQt5 format
                        if "action" in entry and "details" in entry:
                            history_text += f"Timestamp: {entry.get('timestamp', 'N/A')} | Action: {entry.get('action', 'Unknown')}\n"
                            history_text += f"Details: {entry.get('details', 'N/A')}\n"
                        # Handle Tkinter format
                        elif "glyph_id" in entry and "coherence" in entry and "entanglement" in entry:
                            history_text += f"Timestamp: {entry.get('timestamp', 'N/A')} | Action: glyph_cast\n"
                            history_text += f"Details: Cast glyph {entry.get('glyph_id', 'Unknown')} with coherence {entry.get('coherence', 0.0):.2f} and entanglement {entry.get('entanglement', 0.0):.2f}\n"
                        else:
                            history_text += f"Timestamp: {entry.get('timestamp', 'N/A')} | Action: Unknown\n"
                            history_text += f"Details: Invalid entry format\n"
                        history_text += "\n"
                    self.ui.history_display.setPlainText(history_text)
                else:
                    self.ui.history_display.setPlainText("Observer history loaded but format is incorrect.\n")
            else:
                self.ui.history_display.setPlainText("No observer history file found.\n")
        except Exception as e:
            self.ui.history_display.setPlainText(f"Error loading observer history: {e}\n")

    def refresh_narrative_history(self):
        narrative_log_file = "narrative_log.json"
        print(f"Refreshing narrative history from {narrative_log_file}")
        try:
            if os.path.exists(narrative_log_file):
                with open(narrative_log_file, 'r') as f:
                    narrative_history = json.load(f)
                print(f"Loaded narrative history with {len(narrative_history)} entries")
                if isinstance(narrative_history, list):
                    history_text = "\n".join([
                        f"Glyph: {entry.get('glyph_id', 'Unknown')} | Timestamp: {entry.get('timestamp', 'N/A')} | "
                        f"Coherence: {entry.get('coherence', 0.0):.2f} | Entanglement: {entry.get('entanglement', 0.0):.2f}\n"
                        f"Narrative: {entry.get('narrative', 'N/A')}\n"
                        for entry in narrative_history
                    ])
                    self.ui.narrative_history_display.setPlainText(history_text)
                else:
                    self.ui.narrative_history_display.setPlainText("Narrative history loaded but format is incorrect.\n")
            else:
                self.ui.narrative_history_display.setPlainText("No narrative history file found.\n")
        except Exception as e:
            self.ui.narrative_history_display.setPlainText(f"Error loading narrative history: {e}\n")
            print(f"Error in refresh_narrative_history: {e}")

    def refresh_gallery(self, pulse_orbs):
        print("Refreshing gallery")
        # Clear existing thumbnails in the gallery_inner widget
        gallery_inner = self.ui.sidebar_frame.gallery_inner
        while gallery_inner.layout().count():
            item = gallery_inner.layout().takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
        self.thumbnail_cache.clear()  # Clear old references

        # Get list of glyphs from glyph_archive by JSON files, excluding SigilSync verified files
        glyph_jsons = sorted([
            f for f in os.listdir(self.config["GLYPH_DIR"])
            if f.endswith(".json") and not f.endswith("-verified.json")
        ])
        print(f"Glyphs to display in gallery: {len(glyph_jsons)}")

        timestamps = []
        for json_file in glyph_jsons:
            glyph_id = json_file.replace(".json", "")
            json_path = os.path.join(self.config["GLYPH_DIR"], json_file)
            try:
                with open(json_path, 'r') as f:
                    glyph_data = json.load(f)
                # Debug: Log the glyph_data to inspect visual_artifact keys
                print(f"Glyph data for {glyph_id}: visual_artifact={glyph_data.get('visual_artifact')}, visual_artifact_a={glyph_data.get('visual_artifact_a')}, visual_artifact_b={glyph_data.get('visual_artifact_b')}")
                # Determine which image to load based on glyph_style
                artifact_key = "visual_artifact_a" if self.ui.core.glyph_style == "A" else "visual_artifact_b"
                # Fallback to visual_artifact for older glyphs, then to a default
                glyph_filename = glyph_data.get(artifact_key)
                if not glyph_filename or glyph_filename.strip() == "":
                    glyph_filename = glyph_data.get("visual_artifact")
                if not glyph_filename or glyph_filename.strip() == "":
                    # If visual_artifact is also empty or points to a non-existent file (e.g., Glyph-0014.png), construct the correct path
                    glyph_filename = f"{glyph_id}-A.png" if self.ui.core.glyph_style == "A" else f"{glyph_id}-B.png"
                img_path = os.path.join(self.config["GLYPH_DIR"], glyph_filename)
                print(f"Attempting to load glyph image: {img_path}")
                if not os.path.exists(img_path):
                    print(f"Image file not found: {img_path}")
                    continue
                pixmap = QPixmap(img_path)
                if pixmap.isNull():
                    print(f"Pixmap is null for {img_path}. File exists: {os.path.exists(img_path)}, File size: {os.path.getsize(img_path) if os.path.exists(img_path) else 'N/A'} bytes")
                    continue
                image_label = QLabel()
                image_label.setPixmap(pixmap.scaled(100, 100, Qt.KeepAspectRatio, Qt.SmoothTransformation))
                image_label.setAlignment(Qt.AlignCenter)
                # Bind click event to open the modal
                image_label.mousePressEvent = lambda event, path=img_path: self.open_glyph_modal(path)
                gallery_inner.layout().addWidget(image_label)
                timestamps.append((glyph_data["timestamp_utc"], glyph_filename))
            except Exception as e:
                print(f"Error loading glyph image for {glyph_id}: {e}")
                continue

        timestamps.sort()
        self.glyph_list = timestamps
        print(f"Updated glyph list for timeline navigation: {len(self.glyph_list)} glyphs")
        # Use the actual QSlider instead of the proxy
        self.ui.sidebar_frame.timeline_scale.setMaximum(max(len(self.glyph_list) - 1, 0))

        # Update pulse orbs
        print(f"Pulse orbs count: {len(pulse_orbs)}")
        print(f"Current pulse_orbs: {pulse_orbs}")
        if hasattr(self.ui, 'left_panel'):
            self.ui.left_panel.refresh(pulse_orbs)

    def open_glyph_modal(self, img_path):
        """Display a modal dialog with the glyph image and associated .txt file content."""
        print(f"Opening glyph modal for: {img_path}")
        # Create a new dialog
        dialog = QDialog(self.ui)
        dialog.setWindowTitle(f"Glyph: {os.path.basename(img_path)}")
        dialog.resize(700, 600)

        # Set up the layout
        layout = QVBoxLayout()
        dialog.setLayout(layout)

        # Determine the correct image path based on glyph_style
        glyph_id = os.path.splitext(os.path.basename(img_path))[0].replace("-A", "").replace("-B", "")
        json_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.json")
        try:
            if not os.path.exists(json_path):
                raise FileNotFoundError(f"Glyph JSON file not found: {json_path}")
            with open(json_path, 'r') as f:
                glyph_data = json.load(f)
            artifact_key = "visual_artifact_a" if self.ui.core.glyph_style == "A" else "visual_artifact_b"
            glyph_filename = glyph_data.get(artifact_key)
            if not glyph_filename or glyph_filename.strip() == "":
                glyph_filename = glyph_data.get("visual_artifact")
            if not glyph_filename or glyph_filename.strip() == "":
                glyph_filename = f"{glyph_id}-A.png" if self.ui.core.glyph_style == "A" else f"{glyph_id}-B.png"
            glyph_path = os.path.join(self.config["GLYPH_DIR"], glyph_filename)
            print(f"Attempting to load glyph image in modal: {glyph_path}")
            if not os.path.exists(glyph_path):
                raise FileNotFoundError(f"Glyph image file not found: {glyph_path}")
            pixmap = QPixmap(glyph_path)
            if pixmap.isNull():
                print(f"Pixmap is null for {glyph_path}. File exists: {os.path.exists(glyph_path)}, File size: {os.path.getsize(glyph_path) if os.path.exists(glyph_path) else 'N/A'} bytes")
                raise FileNotFoundError("Pixmap is null")
            image_label = QLabel()
            image_label.setPixmap(pixmap.scaled(300, 300, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            image_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(image_label)
        except Exception as e:
            print(f"Error loading glyph image {glyph_path}: {e}")
            image_label = QLabel("Image not found")
            image_label.setStyleSheet("color: white;")
            image_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(image_label)

        # Load and display the associated .txt file
        txt_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.txt")
        txt_content = None
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                txt_content = f.read()
        except UnicodeDecodeError:
            # Fallback to Windows-1252 encoding for older files
            try:
                with open(txt_path, 'r', encoding='windows-1252') as f:
                    txt_content = f.read()
            except Exception as e:
                print(f"Error loading glyph text file {txt_path} with fallback encoding: {e}")
        except Exception as e:
            print(f"Error loading glyph text file {txt_path}: {e}")

        if txt_content is not None:
            text_area = QTextEdit()
            text_area.setReadOnly(True)
            text_area.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
            text_area.setPlainText(txt_content)
            layout.addWidget(text_area)
        else:
            text_area = QTextEdit()
            text_area.setReadOnly(True)
            text_area.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
            text_area.setPlainText("Text file not found or unreadable.")
            layout.addWidget(text_area)

        dialog.exec_()

    def update_timeline_dialog(self, glyph):
        """Update the timeline dialog with the selected glyph's information."""
        if not self.timeline_dialog:
            return

        # Clear the current content of the dialog
        layout = self.timeline_dialog.layout()
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        # Extract glyph_id from the tuple (timestamp, filename)
        glyph_filename = glyph[1]
        glyph_id = os.path.splitext(glyph_filename)[0].replace("-A", "").replace("-B", "")
        json_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.json")
        try:
            if not os.path.exists(json_path):
                raise FileNotFoundError(f"Glyph JSON file not found: {json_path}")
            with open(json_path, 'r') as f:
                glyph_data = json.load(f)
            artifact_key = "visual_artifact_a" if self.ui.core.glyph_style == "A" else "visual_artifact_b"
            glyph_filename = glyph_data.get(artifact_key)
            if not glyph_filename or glyph_filename.strip() == "":
                glyph_filename = glyph_data.get("visual_artifact")
            if not glyph_filename or glyph_filename.strip() == "":
                glyph_filename = f"{glyph_id}-A.png" if self.ui.core.glyph_style == "A" else f"{glyph_id}-B.png"
            glyph_path = os.path.join(self.config["GLYPH_DIR"], glyph_filename)
            print(f"Attempting to load glyph image in timeline: {glyph_path}")
            if not os.path.exists(glyph_path):
                raise FileNotFoundError(f"Glyph image file not found: {glyph_path}")
            pixmap = QPixmap(glyph_path)
            if pixmap.isNull():
                print(f"Pixmap is null for {glyph_path}. File exists: {os.path.exists(glyph_path)}, File size: {os.path.getsize(glyph_path) if os.path.exists(glyph_path) else 'N/A'} bytes")
                raise FileNotFoundError("Pixmap is null")
            image_label = QLabel()
            image_label.setPixmap(pixmap.scaled(300, 300, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            image_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(image_label)
        except Exception as e:
            print(f"Error loading glyph image {glyph_path}: {e}")
            image_label = QLabel("Image not found")
            image_label.setStyleSheet("color: white;")
            image_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(image_label)

        # Load and display the associated .txt file
        txt_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.txt")
        txt_content = None
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                txt_content = f.read()
        except UnicodeDecodeError:
            try:
                with open(txt_path, 'r', encoding='windows-1252') as f:
                    txt_content = f.read()
            except Exception as e:
                print(f"Error loading glyph text file {txt_path} with fallback encoding: {e}")
        except Exception as e:
            print(f"Error loading glyph text file {txt_path}: {e}")

        if txt_content is not None:
            text_area = QTextEdit()
            text_area.setReadOnly(True)
            text_area.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
            text_area.setPlainText(txt_content)
            layout.addWidget(text_area)
        else:
            text_area = QTextEdit()
            text_area.setReadOnly(True)
            text_area.setStyleSheet("background-color: #2d2d44; color: white; font-family: 'Arial'; font-size: 12px;")
            text_area.setPlainText("Text file not found or unreadable.")
            layout.addWidget(text_area)

        self.timeline_dialog.update()

    def handle_timeline_scroll(self, value):
        """Handle the timeline slider movement to display glyphs in a static dialog."""
        value = int(value)
        if not self.glyph_list:
            print("No glyphs available for timeline navigation.")
            return

        if not self.timeline_dialog or not self.timeline_dialog.isVisible():
            self.timeline_dialog = QDialog(self.ui)
            self.timeline_dialog.setWindowTitle("Timeline Navigation - Glyph Viewer")
            self.timeline_dialog.resize(700, 600)
            layout = QVBoxLayout()
            self.timeline_dialog.setLayout(layout)
            self.timeline_dialog.show()
            self.timeline_dialog.finished.connect(lambda: setattr(self, 'timeline_dialog', None))

        if 0 <= value < len(self.glyph_list):
            selected_glyph = {'glyph_id': self.glyph_list[value][1].replace(".png", "")}
            print(f"Timeline slider moved to value {value}, displaying glyph: {selected_glyph['glyph_id']}")
            self.update_timeline_dialog(self.glyph_list[value])
        else:
            print(f"Invalid timeline slider value: {value}")