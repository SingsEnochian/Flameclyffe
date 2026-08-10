from PyQt5.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsEllipseItem
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QBrush, QPen, QColor
import math
import random
import os
import json

class PulseOrbs(QGraphicsView):
    def __init__(self, core):
        super().__init__()
        self.core = core
        self.scene = QGraphicsScene(self)
        self.setScene(self.scene)
        self.setFixedWidth(200)
        self.setFixedHeight(600)
        self.setStyleSheet("background-color: #2d2d44; border: 1px solid #555;")
        self.current_orbs = self.core.pulse_orbs  # Store the orbs to display
        self.pulse_orb_items = []
        self.pulse_glow_items = []
        self.pulse_highlight_items = []
        self.sparkle_items = []
        self.sparkle_count = 5
        self.pulse_tick = 0
        self.init_pulse_orbs()

        # Animation timer for pulse breathing effect
        self.pulse_timer = QTimer()
        self.pulse_timer.timeout.connect(self.animate_pulse_breathing)
        self.pulse_timer.start(10)  # Update every 10ms (~100 FPS, matching Tkinter)

    def init_pulse_orbs(self):
        print(f"Pulse orbs count: {len(self.current_orbs)}")
        print(f"Current pulse_orbs: {self.current_orbs}")
        self.scene.clear()
        self.pulse_orb_items = []
        self.pulse_glow_items = []
        self.pulse_highlight_items = []
        self.sparkle_items = []

        for orb in self.current_orbs:
            cx = orb["cx"]
            cy = orb["cy"]
            size = orb["base_size"]
            # Determine the orb's color based on its primary emotion
            primary_emotion = orb["tags"][0] if orb["tags"] else "Stillness"
            emotion_colors = self.core.config.get("emotion_colors", {})
            orb_color = QColor(emotion_colors.get(primary_emotion, "#FFFFFF"))  # Default to white

            # Base orb
            pulse_orb = QGraphicsEllipseItem(cx - size / 2, cy - size / 2, size, size)
            pulse_orb.setBrush(QBrush(orb_color))
            self.scene.addItem(pulse_orb)
            self.pulse_orb_items.append(pulse_orb)

            # Glow effect (use a lighter shade of the orb color)
            glow_size = size * 1.5
            glow_orb = QGraphicsEllipseItem(cx - glow_size / 2, cy - glow_size / 2, glow_size, glow_size)
            glow_orb.setBrush(QBrush(orb_color.lighter(150)))  # Lighter shade for glow
            glow_orb.setOpacity(0.3)
            self.scene.addItem(glow_orb)
            self.pulse_glow_items.append(glow_orb)

            # Highlight (use white for contrast)
            highlight_size = size * 0.5
            highlight = QGraphicsEllipseItem(cx - highlight_size / 2, cy - highlight_size / 2 + 5, highlight_size, highlight_size)
            highlight.setBrush(QBrush(Qt.white))
            highlight.setOpacity(0.8)
            self.scene.addItem(highlight)
            self.pulse_highlight_items.append(highlight)

            # Sparkles (use a complementary color, e.g., yellow)
            for _ in range(self.sparkle_count):
                sparkle = QGraphicsEllipseItem(cx, cy, 2, 2)
                sparkle.setBrush(QBrush(Qt.yellow))
                sparkle.setOpacity(0)
                self.scene.addItem(sparkle)
                self.sparkle_items.append(sparkle)

    def refresh(self, pulse_orbs):
        """Refresh the pulse orbs in the scene based on the updated list."""
        self.current_orbs = pulse_orbs  # Update the display list without modifying core state
        self.init_pulse_orbs()

    def animate_pulse_breathing(self):
        self.pulse_tick += 0.2  # Scale the tick increment to match the faster timer interval
        for idx, orb in enumerate(self.current_orbs):
            # Safety check to ensure idx is within bounds for all item lists
            if (idx >= len(self.pulse_orb_items) or
                idx >= len(self.pulse_glow_items) or
                idx >= len(self.pulse_highlight_items) or
                idx * self.sparkle_count >= len(self.sparkle_items)):
                print(f"Warning: Index {idx} out of range for pulse items. Skipping.")
                continue

            primary_emotion = orb["tags"][0] if orb["tags"] else "Stillness"
            # Safely access emotion_tempos with a fallback
            emotion_tempos = self.core.config.get("emotion_tempos", {})
            tempo = emotion_tempos.get(primary_emotion, 0.05)  # Default tempo if not found
            size = orb["base_size"]
            cx = orb["cx"]
            cy = orb["cy"]
            pulse_size = size + math.sin(self.pulse_tick * tempo) * 5
            glow_size = pulse_size * 1.5

            # Update base orb
            self.pulse_orb_items[idx].setRect(cx - pulse_size / 2, cy - pulse_size / 2, pulse_size, pulse_size)

            # Update glow
            self.pulse_glow_items[idx].setRect(cx - glow_size / 2, cy - glow_size / 2, glow_size, glow_size)
            self.pulse_glow_items[idx].setOpacity(0.3 + math.sin(self.pulse_tick * tempo) * 0.1)

            # Update highlight
            highlight_size = pulse_size * 0.5
            self.pulse_highlight_items[idx].setRect(cx - highlight_size / 2, cy - highlight_size / 2 + 5, highlight_size, highlight_size)

            # Update sparkles
            for s_idx in range(self.sparkle_count):
                sparkle_idx = idx * self.sparkle_count + s_idx
                angle = (self.pulse_tick * 0.1 + s_idx * (2 * math.pi / self.sparkle_count)) % (2 * math.pi)
                distance = pulse_size * 0.5 + math.sin(self.pulse_tick * 0.05) * 10
                sparkle_x = cx + math.cos(angle) * distance
                sparkle_y = cy + math.sin(angle) * distance
                self.sparkle_items[sparkle_idx].setRect(sparkle_x - 1, sparkle_y - 1, 2, 2)
                self.sparkle_items[sparkle_idx].setOpacity(max(0, math.sin(self.pulse_tick * 0.05 + s_idx) * 0.8))

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            pos = event.pos()
            item = self.scene.itemAt(self.mapToScene(pos), self.transform())
            orb_idx = None
            if item in self.pulse_orb_items:
                orb_idx = self.pulse_orb_items.index(item)
            elif item in self.pulse_glow_items:
                orb_idx = self.pulse_glow_items.index(item)
            elif item in self.pulse_highlight_items:
                orb_idx = self.pulse_highlight_items.index(item)
            elif item in self.sparkle_items:
                sparkle_idx = self.sparkle_items.index(item)
                orb_idx = sparkle_idx // self.sparkle_count

            if orb_idx is not None and orb_idx < len(self.current_orbs):
                orb = self.current_orbs[orb_idx]
                glyph_id = orb.get("glyph_id")
                if glyph_id:
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