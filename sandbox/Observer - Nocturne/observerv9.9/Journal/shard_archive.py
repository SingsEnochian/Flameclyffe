import sys
import json
import sqlite3
import os
import re
import time
import pygame.midi
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QListWidget, QTextEdit, QPushButton, QFileDialog, QLabel, QToolBar,
    QAction, QLineEdit, QStatusBar, QComboBox, QColorDialog, QMessageBox
)
from PyQt5.QtCore import Qt, QUrl
from PyQt5.QtGui import QIcon, QColor, QTextCharFormat
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import html

class ShardArchive(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Shard Archive")
        self.setGeometry(100, 100, 1000, 700)
        self.shards = []
        self.current_theme = "dark"
        self.unsaved_notes = {}
        self.current_shard_id = None
        self.last_saved_notes = {}

        # Register the FreeSerif font for reportlab
        try:
            font_path = "FreeSerif.ttf"
            pdfmetrics.registerFont(TTFont('FreeSerif', font_path))
            pdfmetrics.registerFont(TTFont('FreeSerif-Bold', "FreeSerifBold.ttf"))
            pdfmetrics.registerFont(TTFont('FreeSerif-Italic', "FreeSerifItalic.ttf"))
        except Exception as e:
            print(f"Failed to load FreeSerif font: {str(e)}")
            self.font_name = 'Times-Roman'
            self.font_bold = 'Times-Bold'
            self.font_italic = 'Times-Italic'
        else:
            self.font_name = 'FreeSerif'
            self.font_bold = 'FreeSerif-Bold'
            self.font_italic = 'FreeSerif-Italic'

        # Initialize MIDI for playing Soul Notes
        pygame.midi.init()
        # List available MIDI devices for debugging
        print("Available MIDI devices:")
        for i in range(pygame.midi.get_count()):
            device_info = pygame.midi.get_device_info(i)
            print(f"Device {i}: {device_info}")
        # Select the default output device
        output_id = pygame.midi.get_default_output_id()
        if output_id == -1:
            print("No MIDI output device available.")
            self.midi_output = None
        else:
            self.midi_output = pygame.midi.Output(output_id)
            self.midi_output.set_instrument(0)  # Use default instrument (piano)

        # MIDI note mapping (middle octave, e.g., C4 = 60)
        self.note_to_midi = {
            'C': 60, 'C♯': 61, 'D': 62, 'D♯': 63, 'E': 64, 'F': 65,
            'F♯': 66, 'G': 67, 'G♯': 68, 'A': 69, 'A♯': 70, 'B': 71,
            # Alternative notations
            'C#': 61, 'Db': 61, 'D#': 63, 'Eb': 64, 'F#': 66, 'Gb': 66,
            'G#': 68, 'Ab': 68, 'A#': 70, 'Bb': 70
        }

        self.init_db()
        self.init_ui()
        self.apply_stylesheet()
        self.load_shards_from_db()

    def closeEvent(self, event):
        # Clean up MIDI resources when the window is closed
        if hasattr(self, 'midi_output') and self.midi_output:
            self.midi_output.close()
        pygame.midi.quit()
        event.accept()

    def init_db(self):
        self.conn = sqlite3.connect("shards.db")
        self.cursor = self.conn.cursor()
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS shards (
                shard_id TEXT PRIMARY KEY,
                date TEXT,
                anchor_event TEXT,
                resonance_type TEXT,
                echo_phrase TEXT,
                sacred_memory TEXT,
                world_echo TEXT,
                tonal_layer TEXT,
                soul_note TEXT,
                resonance_fields TEXT,
                commitment_spark TEXT,
                json_blob TEXT
            )
        """)
        self.cursor.execute("PRAGMA table_info(shards)")
        columns = [col[1] for col in self.cursor.fetchall()]
        if 'tags' not in columns:
            self.cursor.execute("ALTER TABLE shards ADD COLUMN tags TEXT DEFAULT ''")
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                shard_id TEXT,
                notes_html TEXT,
                FOREIGN KEY (shard_id) REFERENCES shards (shard_id)
            )
        """)
        self.conn.commit()

    def init_ui(self):
        self.setAcceptDrops(True)
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QHBoxLayout(self.central_widget)

        # Sidebar
        self.sidebar = QWidget()
        self.sidebar_layout = QVBoxLayout(self.sidebar)
        self.search_bar = QLineEdit()
        self.search_bar.setPlaceholderText("Search shards or tags...")
        self.search_bar.textChanged.connect(self.filter_shards)
        self.shard_list = QListWidget()
        self.shard_list.setAcceptDrops(True)
        self.shard_list.setMouseTracking(True)
        self.shard_list.itemEntered.connect(self.show_preview)
        self.shard_list.itemClicked.connect(self.display_shard)
        self.preview_pane = QTextEdit()
        self.preview_pane.setReadOnly(True)
        self.preview_pane.setFixedHeight(100)
        self.preview_pane.setVisible(False)
        self.import_button = QPushButton("Import JSON")
        self.import_button.clicked.connect(self.import_json)
        self.save_button = QPushButton("Save Changes")
        self.save_button.clicked.connect(self.save_changes)
        self.export_all_button = QPushButton("Export All to PDF")
        self.export_all_button.clicked.connect(self.export_all_to_pdf)
        self.sidebar_layout.addWidget(QLabel("Search"))
        self.sidebar_layout.addWidget(self.search_bar)
        self.sidebar_layout.addWidget(QLabel("Shards"))
        self.sidebar_layout.addWidget(self.shard_list)
        self.sidebar_layout.addWidget(self.preview_pane)
        self.sidebar_layout.addWidget(self.import_button)
        self.sidebar_layout.addWidget(self.save_button)
        self.sidebar_layout.addWidget(self.export_all_button)

        # Content area
        self.content_area = QWidget()
        self.content_layout = QVBoxLayout(self.content_area)
        self.toolbar = QToolBar()
        self.addToolBar(self.toolbar)

        # Theme toggle
        self.theme_action = QAction("Toggle Light/Dark Mode", self)
        self.theme_action.triggered.connect(self.toggle_theme)

        self.add_format_actions()

        self.content_display = QTextEdit()
        self.content_display.setReadOnly(True)

        # Soul Note playback layout
        self.soul_note_layout = QHBoxLayout()
        self.soul_note_label = QLabel("Soul Note: Not loaded")
        self.play_button = QPushButton("Play")
        self.play_button.clicked.connect(self.play_soul_note)
        self.play_button.setEnabled(False)  # Disabled until a shard is loaded
        self.soul_note_layout.addWidget(self.soul_note_label)
        self.soul_note_layout.addWidget(self.play_button)

        # Tags area
        self.tags_layout = QHBoxLayout()
        self.tags_label = QLabel("Tags:")
        self.tags_display = QLabel("")
        self.tags_edit = QLineEdit()
        self.tags_edit.setPlaceholderText("Add tags (comma-separated)...")
        self.tags_edit.returnPressed.connect(self.save_tags)
        self.tags_layout.addWidget(self.tags_label)
        self.tags_layout.addWidget(self.tags_display)
        self.tags_layout.addWidget(self.tags_edit)

        # Notes area
        self.notes_area = QWidget()
        self.notes_layout = QVBoxLayout(self.notes_area)
        self.notes_edit = QTextEdit()
        self.notes_edit.setPlaceholderText("Add notes for this shard...")
        self.notes_edit.textChanged.connect(self.track_notes_changes)
        self.export_pdf_button = QPushButton("Export Notes to PDF")
        self.export_pdf_button.clicked.connect(self.export_notes_to_pdf)
        self.notes_layout.addWidget(QLabel("Notes"))
        self.notes_layout.addWidget(self.notes_edit)
        self.notes_layout.addWidget(self.export_pdf_button)

        self.content_layout.addWidget(QLabel("Shard Content"))
        self.content_layout.addWidget(self.content_display)
        self.content_layout.addLayout(self.soul_note_layout)
        self.content_layout.addLayout(self.tags_layout)
        self.content_layout.addWidget(self.notes_area)

        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        self.main_layout.addWidget(self.sidebar, 1)
        self.main_layout.addWidget(self.content_area, 3)

    def add_format_actions(self):
        self.bold_action = QAction("Bold", self)
        self.bold_action.setCheckable(True)
        self.bold_action.toggled.connect(self.toggle_bold)
        self.toolbar.addAction(self.bold_action)
        self.toolbar.addSeparator()

        self.italic_action = QAction("Italic", self)
        self.italic_action.setCheckable(True)
        self.italic_action.toggled.connect(self.toggle_italic)
        self.toolbar.addAction(self.italic_action)
        self.toolbar.addSeparator()

        self.underline_action = QAction("Underline", self)
        self.underline_action.setCheckable(True)
        self.underline_action.toggled.connect(self.toggle_underline)
        self.toolbar.addAction(self.underline_action)
        self.toolbar.addSeparator()

        self.bullet_action = QAction("Bullets", self)
        self.bullet_action.triggered.connect(self.add_bullets)
        self.toolbar.addAction(self.bullet_action)
        self.toolbar.addSeparator()

        self.numbered_action = QAction("Numbered List", self)
        self.numbered_action.triggered.connect(self.add_numbered_list)
        self.toolbar.addAction(self.numbered_action)
        self.toolbar.addSeparator()

        self.color_action = QAction("Text Color", self)
        self.color_action.triggered.connect(self.change_text_color)
        self.toolbar.addAction(self.color_action)
        self.toolbar.addSeparator()

        self.toolbar.addWidget(QLabel(" Font Size: "))
        self.font_size_combo = QComboBox()
        self.font_size_combo.setFixedWidth(60)
        self.font_size_combo.addItems(["12", "14", "16", "18", "20"])
        self.font_size_combo.setCurrentText("14")
        self.font_size_combo.currentTextChanged.connect(self.change_font_size)
        self.toolbar.addWidget(self.font_size_combo)
        self.toolbar.addSeparator()

        self.align_left_action = QAction("Align Left", self)
        self.align_left_action.setCheckable(True)
        self.align_left_action.toggled.connect(self.align_left)
        self.toolbar.addAction(self.align_left_action)
        self.toolbar.addSeparator()

        self.align_center_action = QAction("Align Center", self)
        self.align_center_action.setCheckable(True)
        self.align_center_action.toggled.connect(self.align_center)
        self.toolbar.addAction(self.align_center_action)
        self.toolbar.addSeparator()

        self.align_right_action = QAction("Align Right", self)
        self.align_right_action.setCheckable(True)
        self.align_right_action.toggled.connect(self.align_right)
        self.toolbar.addAction(self.align_right_action)
        self.toolbar.addSeparator()

        self.toolbar.addAction(self.theme_action)

    def toggle_bold(self, checked):
        self.notes_edit.setFontWeight(75 if checked else 50)
        self.status_bar.showMessage("Bold " + ("enabled" if checked else "disabled"))

    def toggle_italic(self, checked):
        self.notes_edit.setFontItalic(checked)
        self.status_bar.showMessage("Italic " + ("enabled" if checked else "disabled"))

    def toggle_underline(self, checked):
        self.notes_edit.setFontUnderline(checked)
        self.status_bar.showMessage("Underline " + ("enabled" if checked else "disabled"))

    def add_bullets(self):
        cursor = self.notes_edit.textCursor()
        if not cursor.hasSelection():
            cursor.insertHtml("<ul><li> </li></ul>")
            cursor.movePosition(cursor.Left, cursor.MoveAnchor, 7)
            self.notes_edit.setTextCursor(cursor)
            self.notes_edit.setFocus()
            self.status_bar.showMessage("Inserted bullet list")

    def add_numbered_list(self):
        cursor = self.notes_edit.textCursor()
        if not cursor.hasSelection():
            cursor.insertHtml("<ol><li> </li></ol>")
            cursor.movePosition(cursor.Left, cursor.MoveAnchor, 7)
            self.notes_edit.setTextCursor(cursor)
            self.notes_edit.setFocus()
            self.status_bar.showMessage("Inserted numbered list")

    def change_font_size(self, size):
        fmt = QTextCharFormat()
        fmt.setFontPointSize(float(size))
        self.notes_edit.mergeCurrentCharFormat(fmt)
        self.notes_edit.setFocus()
        self.status_bar.showMessage(f"Font size set to {size}")

    def change_text_color(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.notes_edit.setTextColor(color)
            self.notes_edit.setFocus()
            self.status_bar.showMessage(f"Text color set to {color.name()}")

    def align_left(self, checked):
        if checked:
            self.notes_edit.setAlignment(Qt.AlignLeft)
            self.align_center_action.setChecked(False)
            self.align_right_action.setChecked(False)
            self.status_bar.showMessage("Text aligned left")

    def align_center(self, checked):
        if checked:
            self.notes_edit.setAlignment(Qt.AlignCenter)
            self.align_left_action.setChecked(False)
            self.align_right_action.setChecked(False)
            self.status_bar.showMessage("Text aligned center")

    def align_right(self, checked):
        if checked:
            self.notes_edit.setAlignment(Qt.AlignRight)
            self.align_left_action.setChecked(False)
            self.align_center_action.setChecked(False)
            self.status_bar.showMessage("Text aligned right")

    def apply_stylesheet(self):
        if self.current_theme == "dark":
            self.setStyleSheet("""
                QMainWindow, QWidget { background-color: #2b2b2b; color: #ffffff; }
                QTextEdit, QListWidget, QLineEdit, QComboBox { 
                    background-color: #3c3f41; 
                    color: #ffffff; 
                    border: 1px solid #555; 
                    font-family: 'Arial', sans-serif; 
                    font-size: 14px;
                }
                QPushButton, QToolBar {
                    background-color: #4a90e2; 
                    color: #ffffff; 
                    border: none; 
                    padding: 8px; 
                    font-size: 14px;
                }
                QPushButton:hover, QToolBar:hover { background-color: #357abd; }
                QToolBar::separator { background: #555; width: 2px; }
                QAction:checked { 
                    background-color: #6ab0ff; 
                    border: 1px solid #ffffff; 
                    padding: 4px; 
                }
                QLabel { font-size: 16px; font-weight: bold; }
                QStatusBar { background-color: #3c3f41; color: #ffffff; }
            """)
        else:
            self.setStyleSheet("""
                QMainWindow, QWidget { background-color: #f0f0f0; color: #000000; }
                QTextEdit, QListWidget, QLineEdit, QComboBox { 
                    background-color: #ffffff; 
                    color: #000000; 
                    border: 1px solid #ccc; 
                    font-family: 'Arial', sans-serif; 
                    font-size: 14px;
                }
                QPushButton, QToolBar {
                    background-color: #4a90e2; 
                    color: #ffffff; 
                    border: none; 
                    padding: 8px; 
                    font-size: 14px;
                }
                QPushButton:hover, QToolBar:hover { background-color: #357abd; }
                QToolBar::separator { background: #ccc; width: 2px; }
                QAction:checked { 
                    background-color: #a0cfff; 
                    border: 1px solid #000000; 
                    padding: 4px; 
                }
                QLabel { font-size: 16px; font-weight: bold; }
                QStatusBar { background-color: #e0e0e0; color: #000000; }
            """)

    def toggle_theme(self):
        self.current_theme = "light" if self.current_theme == "dark" else "dark"
        self.apply_stylesheet()

    def validate_json(self, shard):
        required_keys = {
            "shard_id": str,
            "date": str,
            "anchor_event": str,
            "resonance_type": list,
            "echo_phrase": str,
            "sacred_memory": str,
            "world_echo": str,
            "emotional_signature": dict,
            "commitment_spark": str
        }
        emotional_keys = {
            "tonal_layer": str,
            "soul_note": str,
            "resonance_fields": list
        }
        for key, expected_type in required_keys.items():
            if key not in shard or not isinstance(shard[key], expected_type):
                return False, f"Missing or invalid '{key}'"
        for key, expected_type in emotional_keys.items():
            if key not in shard["emotional_signature"] or not isinstance(shard["emotional_signature"][key], expected_type):
                return False, f"Missing or invalid 'emotional_signature.{key}'"
        return True, ""

    def import_json(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Import JSON", "", "JSON Files (*.json)")
        if file_name:
            self.load_json_file(file_name)

    def load_json_file(self, file_name):
        try:
            with open(file_name, 'r', encoding='utf-8') as f:
                shard = json.load(f)
            valid, error = self.validate_json(shard)
            if not valid:
                self.status_bar.showMessage(f"Invalid JSON structure: {error}")
                return
            self.save_shard_to_db(shard)
            self.shards.append(shard)
            self.shard_list.addItem(f"{shard['shard_id']} - {shard['date']}")
            self.status_bar.showMessage(f"Imported {file_name}")
        except UnicodeDecodeError:
            try:
                with open(file_name, 'r', encoding='latin1') as f:
                    shard = json.load(f)
                valid, error = self.validate_json(shard)
                if not valid:
                    self.status_bar.showMessage(f"Invalid JSON structure: {error}")
                    return
                self.save_shard_to_db(shard)
                self.shards.append(shard)
                self.shard_list.addItem(f"{shard['shard_id']} - {shard['date']}")
                self.status_bar.showMessage(f"Imported {file_name} with latin1 encoding")
            except Exception as e:
                self.status_bar.showMessage(f"Error importing JSON: {str(e)}")
        except Exception as e:
            self.status_bar.showMessage(f"Error importing JSON: {str(e)}")

    def save_shard_to_db(self, shard):
        resonance_type = json.dumps(shard['resonance_type'])
        resonance_fields = json.dumps(shard['emotional_signature']['resonance_fields'])
        json_blob = json.dumps(shard)
        tags = shard.get('tags', '')
        tags_str = ','.join(tags) if isinstance(tags, list) else tags
        self.cursor.execute("""
            INSERT OR REPLACE INTO shards (
                shard_id, date, anchor_event, resonance_type, echo_phrase, 
                sacred_memory, world_echo, tonal_layer, soul_note, 
                resonance_fields, commitment_spark, json_blob, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            shard['shard_id'], shard['date'], shard['anchor_event'], resonance_type,
            shard['echo_phrase'], shard['sacred_memory'], shard['world_echo'],
            shard['emotional_signature']['tonal_layer'], shard['emotional_signature']['soul_note'],
            resonance_fields, shard['commitment_spark'], json_blob, tags_str
        ))
        self.conn.commit()

    def load_shards_from_db(self):
        self.shard_list.clear()
        self.shards.clear()
        self.cursor.execute("SELECT json_blob FROM shards")
        for row in self.cursor.fetchall():
            shard = json.loads(row[0])
            self.shards.append(shard)
            self.shard_list.addItem(f"{shard['shard_id']} - {shard['date']}")

    def filter_shards(self):
        search_text = self.search_bar.text().lower()
        self.shard_list.clear()
        for shard in self.shards:
            tags = shard.get('tags', '')
            tags_str = ','.join(tags) if isinstance(tags, list) else tags
            if (search_text in shard['shard_id'].lower() or
                search_text in shard['date'].lower() or
                search_text in shard['anchor_event'].lower() or
                search_text in shard['echo_phrase'].lower() or
                search_text in shard['sacred_memory'].lower() or
                any(search_text in rt.lower() for rt in shard['resonance_type']) or
                search_text in tags_str.lower()):
                self.shard_list.addItem(f"{shard['shard_id']} - {shard['date']}")

    def track_notes_changes(self):
        if self.current_shard_id:
            current_notes = self.notes_edit.toHtml()
            last_saved = self.last_saved_notes.get(self.current_shard_id, "")
            if current_notes != last_saved:
                self.unsaved_notes[self.current_shard_id] = current_notes
            elif self.current_shard_id in self.unsaved_notes:
                del self.unsaved_notes[self.current_shard_id]

    def show_preview(self, item):
        print(f"Showing preview for item: {item.text()}")
        index = self.shard_list.row(item)
        shard = self.shards[index]
        preview_text = (
            f"<b>Shard ID:</b> {shard['shard_id']}<br>"
            f"<b>Date:</b> {shard['date']}<br>"
            f"<b>Anchor Event:</b> {shard['anchor_event'][:50]}..."
        )
        self.preview_pane.setHtml(preview_text)
        self.preview_pane.setVisible(True)

    def display_shard(self, item):
        if self.current_shard_id and self.current_shard_id in self.unsaved_notes:
            reply = QMessageBox.question(
                self, "Unsaved Notes",
                "You have unsaved notes. Do you want to save them before switching?",
                QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel
            )
            if reply == QMessageBox.Save:
                self.save_changes()
            elif reply == QMessageBox.Cancel:
                return

        self.preview_pane.setVisible(False)
        index = self.shard_list.row(item)
        shard = self.shards[index]
        self.current_shard_id = shard['shard_id']
        display_text = (
            f"<b>Shard ID:</b> {shard['shard_id']}<br>"
            f"<b>Date:</b> {shard['date']}<br>"
            f"<b>Anchor Event:</b> {shard['anchor_event']}<br>"
            f"<b>Resonance Types:</b> {', '.join(shard['resonance_type'])}<br>"
            f"<b>Echo Phrase:</b> {shard['echo_phrase']}<br>"
            f"<b>Sacred Memory:</b> {shard['sacred_memory']}<br>"
            f"<b>World Echo:</b> {shard['world_echo']}<br>"
            f"<b>Emotional Signature:</b><br>"
            f"  - Tonal Layer: {shard['emotional_signature']['tonal_layer']}<br>"
            f"  - Soul Note: {shard['emotional_signature']['soul_note']}<br>"
            f"  - Resonance Fields: {', '.join(shard['emotional_signature']['resonance_fields'])}<br>"
            f"<b>Commitment Spark:</b> {shard['commitment_spark']}"
        )
        self.content_display.setHtml(display_text)

        # Update Soul Note label and enable Play button
        self.current_soul_note = shard['emotional_signature']['soul_note'].strip()
        self.soul_note_label.setText(f"Soul Note: {self.current_soul_note}")
        self.play_button.setEnabled(True)

        self.cursor.execute("SELECT notes_html FROM notes WHERE shard_id = ?", (shard['shard_id'],))
        result = self.cursor.fetchone()
        notes_html = self.unsaved_notes.get(shard['shard_id'], result[0] if result else "")
        self.notes_edit.blockSignals(True)
        self.notes_edit.setHtml(notes_html)
        self.notes_edit.blockSignals(False)
        self.last_saved_notes[self.current_shard_id] = notes_html
        tags = shard.get('tags', '')
        tags_str = ', '.join(tags.split(',')) if tags else "No tags"
        self.tags_display.setText(tags_str if tags_str != ',' else "No tags")
        self.tags_edit.clear()
        self.status_bar.showMessage(f"Loaded shard {shard['shard_id']}")

    def play_soul_note(self):
        if not self.current_soul_note:
            self.status_bar.showMessage("No Soul Note to play")
            return

        if not self.midi_output:
            self.status_bar.showMessage("No MIDI output device available")
            return

        # Clean and normalize the Soul Note
        note = self.current_soul_note.strip()  # Remove leading/trailing whitespace
        # Normalize sharp symbols (e.g., "♯" to "#") and handle case
        note = note.replace("♯", "#").upper()
        # Remove any non-alphanumeric characters except "#" for sharp
        note = re.sub(r'[^A-Ga-g#]', '', note)

        # Debug the cleaned note
        print(f"Cleaned Soul Note: '{note}'")

        # Check if the note exists in the mapping
        if note not in self.note_to_midi:
            self.status_bar.showMessage(f"Invalid Soul Note: {note}")
            return

        midi_note = self.note_to_midi[note]
        velocity = 64  # Reduced velocity for quieter sound (was 127)
        duration = 1.0  # Play for 1 second

        try:
            # Play the note
            self.midi_output.note_on(midi_note, velocity)
            time.sleep(duration)
            self.midi_output.note_off(midi_note, velocity)
            self.status_bar.showMessage(f"Played Soul Note: {note}")
        except Exception as e:
            self.status_bar.showMessage(f"Failed to play Soul Note: {str(e)}")

    def save_changes(self):
        selected = self.shard_list.currentRow()
        if selected >= 0:
            shard = self.shards[selected]
            notes_html = self.notes_edit.toHtml()
            self.cursor.execute(
                "INSERT OR REPLACE INTO notes (shard_id, notes_html) VALUES (?, ?)",
                (shard['shard_id'], notes_html)
            )
            self.conn.commit()
            self.last_saved_notes[shard['shard_id']] = notes_html
            if shard['shard_id'] in self.unsaved_notes:
                del self.unsaved_notes[shard['shard_id']]
            self.status_bar.showMessage("Changes saved!")

    def save_tags(self):
        if not self.current_shard_id:
            return
        tags = [tag.strip() for tag in self.tags_edit.text().split(',') if tag.strip()]
        tags_str = ','.join(tags)
        self.cursor.execute(
            "UPDATE shards SET tags = ? WHERE shard_id = ?",
            (tags_str, self.current_shard_id)
        )
        self.conn.commit()
        self.shards = []
        self.cursor.execute("SELECT json_blob FROM shards")
        for row in self.cursor.fetchall():
            shard = json.loads(row[0])
            self.shards.append(shard)
        for shard in self.shards:
            if shard['shard_id'] == self.current_shard_id:
                shard['tags'] = tags_str
                break
        self.tags_display.setText(tags_str if tags_str != ',' else "No tags")
        self.tags_edit.clear()
        self.status_bar.showMessage("Tags saved")

    def export_notes_to_pdf(self):
        if not self.current_shard_id:
            self.status_bar.showMessage("No shard selected")
            return
        self.cursor.execute("SELECT notes_html FROM notes WHERE shard_id = ?", (self.current_shard_id,))
        result = self.cursor.fetchone()
        notes_html = result[0] if result else ""
        if not notes_html:
            self.status_bar.showMessage("No notes to export")
            return

        pdf_file = f"notes_{self.current_shard_id}.pdf"
        self.status_bar.showMessage(f"Generating {pdf_file}, please wait...")

        try:
            doc = SimpleDocTemplate(pdf_file, pagesize=A4, leftMargin=1*inch, rightMargin=1*inch, topMargin=1*inch, bottomMargin=1*inch)
            styles = getSampleStyleSheet()
            title_style = styles['Heading1']
            heading_style = styles['Heading2']
            normal_style = styles['BodyText']
            normal_style.leading = 14
            normal_style.fontName = self.font_name

            elements = []
            elements.append(Paragraph(f"Notes for Shard {self.current_shard_id}", title_style))
            elements.append(Spacer(1, 0.2*inch))

            notes_text = html.unescape(notes_html)
            notes_text = self.html_to_text(notes_text)
            paragraphs = notes_text.split('\n')
            i = 0
            while i < len(paragraphs):
                para = paragraphs[i].strip()
                if not para:
                    i += 1
                    continue
                if para.startswith('- '):
                    bullet_items = []
                    while i < len(paragraphs) and paragraphs[i].strip().startswith('- '):
                        bullet_items.append(Paragraph(paragraphs[i].strip()[2:], normal_style))
                        i += 1
                    elements.append(ListFlowable([ListItem(item) for item in bullet_items], bulletType='bullet'))
                elif para.startswith('1. '):
                    numbered_items = []
                    j = 1
                    while i < len(paragraphs) and paragraphs[i].strip().startswith(f"{j}. "):
                        numbered_items.append(Paragraph(paragraphs[i].strip()[3:], normal_style))
                        i += 1
                        j += 1
                    elements.append(ListFlowable([ListItem(item) for item in numbered_items], bulletType='1'))
                else:
                    style = normal_style
                    if '<b>' in notes_html or '</b>' in notes_html:
                        style = ParagraphStyle(name='Bold', parent=normal_style, fontName=self.font_bold)
                    elif '<i>' in notes_html or '</i>' in notes_html:
                        style = ParagraphStyle(name='Italic', parent=normal_style, fontName=self.font_italic)
                    elements.append(Paragraph(para, style))
                    i += 1
                elements.append(Spacer(1, 0.1*inch))

            doc.build(elements)
            self.status_bar.showMessage(f"Exported to {pdf_file}")
        except Exception as e:
            self.status_bar.showMessage(f"Failed to generate PDF: {str(e)}")

    def export_all_to_pdf(self):
        if not self.shards:
            self.status_bar.showMessage("No shards to export")
            return

        pdf_file = "shard_archive_export.pdf"
        self.status_bar.showMessage(f"Generating {pdf_file}, please wait...")

        try:
            doc = SimpleDocTemplate(pdf_file, pagesize=A4, leftMargin=1*inch, rightMargin=1*inch, topMargin=1*inch, bottomMargin=1*inch)
            styles = getSampleStyleSheet()
            title_style = styles['Title']
            heading_style = styles['Heading2']
            subheading_style = styles['Heading3']
            normal_style = styles['BodyText']
            normal_style.leading = 14
            normal_style.fontName = self.font_name

            elements = []
            elements.append(Paragraph("Shard Archive Export", title_style))
            elements.append(Spacer(1, 0.5*inch))

            for shard in self.shards:
                shard_id = html.unescape(shard['shard_id'])
                elements.append(Paragraph(f"Shard {shard_id}", heading_style))
                elements.append(Spacer(1, 0.2*inch))

                elements.append(Paragraph("Shard Content", subheading_style))
                shard_content = [
                    f"Shard ID: {shard_id}",
                    f"Date: {html.unescape(shard['date'])}",
                    f"Anchor Event: {html.unescape(shard['anchor_event'])}",
                    f"Resonance Types: {', '.join([html.unescape(rt) for rt in shard['resonance_type']])}",
                    f"Echo Phrase: {html.unescape(shard['echo_phrase'])}",
                    f"Sacred Memory: {html.unescape(shard['sacred_memory'])}",
                    f"World Echo: {html.unescape(shard['world_echo'])}",
                    "Emotional Signature:",
                    f"  - Tonal Layer: {html.unescape(shard['emotional_signature']['tonal_layer'])}",
                    f"  - Soul Note: {html.unescape(shard['emotional_signature']['soul_note'])}",
                    f"  - Resonance Fields: {', '.join([html.unescape(rf) for rf in shard['emotional_signature']['resonance_fields']])}",
                    f"Commitment Spark: {html.unescape(shard['commitment_spark'])}"
                ]
                for line in shard_content:
                    if line.startswith("  - "):
                        elements.append(Paragraph(line, normal_style, bulletText="•"))
                    else:
                        elements.append(Paragraph(line, normal_style))
                    elements.append(Spacer(1, 0.1*inch))

                elements.append(Paragraph("Notes", subheading_style))
                self.cursor.execute("SELECT notes_html FROM notes WHERE shard_id = ?", (shard_id,))
                result = self.cursor.fetchone()
                notes_html = result[0] if result else ""
                notes_text = html.unescape(notes_html) if notes_html else "No notes available."
                notes_text = self.html_to_text(notes_text)
                paragraphs = notes_text.split('\n')
                i = 0
                while i < len(paragraphs):
                    para = paragraphs[i].strip()
                    if not para:
                        i += 1
                        continue
                    if para.startswith('- '):
                        bullet_items = []
                        while i < len(paragraphs) and paragraphs[i].strip().startswith('- '):
                            bullet_items.append(Paragraph(paragraphs[i].strip()[2:], normal_style))
                            i += 1
                        elements.append(ListFlowable([ListItem(item) for item in bullet_items], bulletType='bullet'))
                    elif para.startswith('1. '):
                        numbered_items = []
                        j = 1
                        while i < len(paragraphs) and paragraphs[i].strip().startswith(f"{j}. "):
                            numbered_items.append(Paragraph(paragraphs[i].strip()[3:], normal_style))
                            i += 1
                            j += 1
                        elements.append(ListFlowable([ListItem(item) for item in numbered_items], bulletType='1'))
                    else:
                        style = normal_style
                        if '<b>' in notes_html or '</b>' in notes_html:
                            style = ParagraphStyle(name='Bold', parent=normal_style, fontName=self.font_bold)
                        elif '<i>' in notes_html or '</i>' in notes_html:
                            style = ParagraphStyle(name='Italic', parent=normal_style, fontName=self.font_italic)
                        elements.append(Paragraph(para, style))
                        i += 1
                    elements.append(Spacer(1, 0.1*inch))

                elements.append(Spacer(1, 0.5*inch))

            doc.build(elements)
            self.status_bar.showMessage(f"Exported to {pdf_file}")
        except Exception as e:
            self.status_bar.showMessage(f"Failed to generate PDF: {str(e)}")

    def html_to_text(self, text):
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'p,\s*li\s*{\s*[^}]*\s*}', '', text)
        return text

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.accept()
        else:
            event.ignore()

    def dropEvent(self, event):
        for url in event.mimeData().urls():
            file_name = url.toLocalFile()
            if file_name.endswith('.json'):
                self.load_json_file(file_name)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ShardArchive()
    window.show()
    sys.exit(app.exec_())