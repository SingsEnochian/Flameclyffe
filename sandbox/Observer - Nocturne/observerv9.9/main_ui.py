import sys
import os
import pygame
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QTextEdit, QPushButton, QLineEdit, QComboBox, QCheckBox
)
from PyQt5.QtCore import QTimer, Qt
from PyQt5.QtGui import QBrush, QPen

# Debug: Print the path of the imported config module
import config
print(f"Imported config.py from: {config.__file__}")

# Change working directory to load shard_archive.py
original_dir = os.getcwd()
os.chdir(os.path.join(original_dir, "journal"))
try:
    from shard_archive import ShardArchive
except Exception as e:
    print(f"Failed to import ShardArchive: {e}")
    sys.exit(1)
finally:
    os.chdir(original_dir)

from ui.input_tab import InputTab
from ui.feedback_tab import FeedbackTab
from ui.narrative_tab import NarrativeTab
from ui.history_tab import HistoryTab
from ui.rituals_tab import RitualsTab
from ui.symbolic_echoes_tab import SymbolicEchoesTab
from ui.pulse_orbs import PulseOrbs
from ui.sidebar import Sidebar
from core_logic import CoreLogic
from config import CONFIG

class MainUI(QMainWindow):
    def __init__(self):
        super().__init__()
        print("Initializing MainUI...")
        # Initialize pygame mixer in mono mode at startup
        try:
            pygame.mixer.init(frequency=44100, channels=1)
            print(f"Pygame mixer initialized with settings: {pygame.mixer.get_init()}")
        except Exception as e:
            print(f"Error initializing pygame mixer: {e}")
        self.setWindowTitle("Universal Horizon Observer with Shard Archive")
        self.setGeometry(100, 100, 1400, 1000)

        # Initialize CoreLogic for the Observer
        print("Initializing CoreLogic...")
        try:
            self.core = CoreLogic(CONFIG, self.update_ui_elements)
            self.core.set_ui(self)
            # Debug: Check pulse_orbs after CoreLogic initialization
            print(f"pulse_orbs after CoreLogic init: {self.core.pulse_orbs}")
        except Exception as e:
            print(f"Error initializing CoreLogic: {e}")
            raise

        # Main widget and layout
        self.main_widget = QWidget()
        self.setCentralWidget(self.main_widget)
        self.main_layout = QHBoxLayout(self.main_widget)

        # Left panel (pulse orbs)
        print("Initializing Pulse Orbs...")
        try:
            self.left_panel = PulseOrbs(self.core)
            self.main_layout.addWidget(self.left_panel)
        except Exception as e:
            print(f"Error initializing Pulse Orbs: {e}")
            raise

        # Central area (banner and tabs)
        self.central_area = QWidget()
        self.central_layout = QVBoxLayout(self.central_area)

        # Banner
        print("Setting up banner...")
        try:
            self.banner_label = QLabel("")
            self.banner_label.setFixedHeight(40)
            self.banner_label.setAlignment(Qt.AlignCenter)
            self.central_layout.addWidget(self.banner_label)

            # Start banner animation
            self.start_banner_animation()
        except Exception as e:
            print(f"Error setting up banner: {e}")
            raise

        # Tabs
        print("Setting up tabs...")
        self.tabs = QTabWidget()
        self.central_layout.addWidget(self.tabs)
        self.main_layout.addWidget(self.central_area)

        # Sidebar (glyph gallery and timeline)
        print("Initializing Sidebar...")
        try:
            self.sidebar_frame = Sidebar(self.core)
            self.main_layout.addWidget(self.sidebar_frame)
        except Exception as e:
            print(f"Error initializing Sidebar: {e}")
            raise

        # Observer tabs
        self.setup_observer_tabs()

        # Shard Archive tab (using the original PyQt5 app)
        print("Initializing Shard Archive tab...")
        try:
            self.shard_archive_tab = ShardArchive()
            print("Adding Shard Archive tab...")
            self.tabs.addTab(self.shard_archive_tab, "Shard Archive")
        except Exception as e:
            print(f"Error initializing Shard Archive tab: {e}")
            raise

        # Debug: Explicitly call refresh_initial_state after UI setup
        print("Calling refresh_initial_state...")
        try:
            self.core.refresh_initial_state()
            print(f"pulse_orbs after refresh_initial_state: {self.core.pulse_orbs}")
        except Exception as e:
            print(f"Error in refresh_initial_state: {e}")
            raise

        # Apply dark theme styling
        try:
            self.apply_stylesheet()
        except Exception as e:
            print(f"Error applying stylesheet: {e}")
            raise

        print("MainUI initialization complete.")

    def apply_stylesheet(self):
        # Debug: Print config values to confirm they are loaded
        print("Config values for styling:")
        for key in ["bg_color", "fg_color", "glow_color", "highlight_color"]:
            print(f"{key}: {self.core.config.get(key, 'Not found')}")

        # Use colors from config.py for Twilight Sparkle's theme
        try:
            bg_color = self.core.config.get("bg_color", "#2E1A47")  # Fallback to dark purple-blue
            fg_color = self.core.config.get("fg_color", "#FFFFFF")  # Fallback to white
            glow_color = self.core.config.get("glow_color", "#FF66CC")  # Fallback to Twilight's magic aura
            highlight_color = self.core.config.get("highlight_color", "#A77BCA")  # Fallback to lighter purple
        except Exception as e:
            print(f"Error accessing config keys: {e}")
            raise

        stylesheet = f"""
            QMainWindow, QWidget {{
                background-color: {bg_color};
                color: {fg_color};
            }}
            QTabWidget::pane {{
                border: 1px solid {glow_color};
                background-color: {bg_color};
            }}
            QTabBar::tab {{
                background-color: #3a3a50;
                color: {fg_color};
                padding: 10px 20px;  /* Increased padding for better spacing */
                min-width: 120px;  /* Ensure tabs are wide enough */
                border: 1px solid {glow_color};
                border-bottom: none;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
            }}
            QTabBar::tab:selected {{
                background-color: {glow_color};
                color: #000000;
            }}
            QTextEdit, QLineEdit, QComboBox {{
                background-color: #3a3a50;
                color: {fg_color};
                border: 1px solid #555;
                padding: 5px;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
            }}
            QTextEdit:focus, QLineEdit:focus, QComboBox:focus {{
                border: 1px solid {glow_color};
            }}
            QPushButton {{
                background-color: {glow_color};
                color: #000000;
                border: none;
                padding: 8px;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
            }}
            QPushButton:hover {{
                background-color: {highlight_color};
            }}
            QLabel {{
                color: {fg_color};
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                font-weight: bold;
                padding: 4px;
            }}
            QCheckBox, QSlider {{
                color: {fg_color};
                font-family: 'Arial', sans-serif;
                font-size: 14px;
            }}
            QListWidget {{
                background-color: #3a3a50;
                color: {fg_color};
                border: 1px solid #555;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
            }}
            QListWidget::item:selected {{
                background-color: {glow_color};
                color: #000000;
            }}
        """
        print("Applying stylesheet...")
        self.setStyleSheet(stylesheet)
        print("Stylesheet applied successfully.")

    @property
    def gallery_inner(self):
        """Proxy property to provide access to sidebar_frame.gallery_inner for CoreLogic compatibility."""
        return self.sidebar_frame.gallery_inner

    @property
    def gallery_inner_layout(self):
        """Proxy property for CoreLogic compatibility."""
        return self.sidebar_frame.gallery_inner_layout

    @property
    def filter_vars(self):
        """Proxy property to provide access to sidebar_frame.filter_vars with Tkinter compatibility."""
        class ProxyDict:
            def __init__(self, filter_vars):
                self._filter_vars = filter_vars

            def __getitem__(self, key):
                checkbox = self._filter_vars[key]
                class Proxy:
                    def __init__(self, checkbox):
                        self.checkbox = checkbox
                    def get(self):
                        return 1 if self.checkbox.isChecked() else 0
                return Proxy(checkbox)

            def items(self):
                return [(key, self[key]) for key in self._filter_vars.keys()]

        return ProxyDict(self.sidebar_frame.filter_vars)

    @property
    def timeline_scale(self):
        """Proxy for Sidebar's timeline_scale to mimic Tkinter's Scale widget."""
        class Proxy:
            def __init__(self, slider):
                self.slider = slider
            def get(self):
                return self.slider.value()
            def set(self, value):
                self.slider.setValue(int(value))
        return Proxy(self.sidebar_frame.timeline_scale)

    # Proxy properties for Feedback tab labels and text displays
    @property
    def observer_state_label(self):
        """Proxy for Feedback tab's observer_state_label."""
        return self.feedback_tab.observer_state_label

    @property
    def pulse_label(self):
        """Proxy for Feedback tab's pulse_label."""
        return self.feedback_tab.pulse_label

    @property
    def harmonic_index_label(self):
        """Proxy for Feedback tab's harmonic_index_label."""
        return self.feedback_tab.harmonic_index_label

    @property
    def log_display(self):
        """Proxy for Feedback tab's log_display."""
        return self.feedback_tab.log_display

    @property
    def response_field(self):
        """Proxy for Feedback tab's response_field."""
        return self.feedback_tab.response_field

    # Proxy properties for Narrative tab text displays
    @property
    def narrative_display(self):
        """Proxy for Narrative tab's narrative_display."""
        return self.narrative_tab.narrative_display

    @property
    def narrative_history_display(self):
        """Proxy for Narrative tab's narrative_history_display."""
        return self.narrative_tab.narrative_history_display

    # Proxy property for History tab text display
    @property
    def history_display(self):
        """Proxy for History tab's history_display."""
        return self.history_tab.history_display

    # Proxy properties for Input tab elements
    @property
    def confirmation(self):
        """Proxy for Input tab's confirmation label."""
        return self.input_tab.confirmation

    @property
    def narrative_infusion(self):
        """Proxy for Input tab's narrative_infusion label."""
        return self.input_tab.narrative_infusion

    @property
    def etf_label(self):
        """Proxy for Input tab's etf_label."""
        return self.input_tab.etf_label

    @property
    def etf_bind_button(self):
        """Proxy for Input tab's etf_bind_button."""
        return self.input_tab.etf_bind_button

    def visualize_chaos_on_canvas(self, *args):
        """Proxy for Input tab's visualize_chaos_on_canvas method."""
        print(f"Visualizing chaos on canvas with args: {args}")
        return self.input_tab.visualize_chaos_on_canvas(*args)

    # Proxy properties for Input tab fields to mimic Tkinter's get() method
    @property
    def input_field(self):
        """Proxy for Input tab's input_field."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def get(self):
                return self.widget.text()
            def clear(self):
                self.widget.clear()
        return Proxy(self.input_tab.input_field)

    @property
    def target_field(self):
        """Proxy for Input tab's target_field."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def get(self):
                return self.widget.text()
            def clear(self):
                self.widget.clear()
        return Proxy(self.input_tab.target_field)

    @property
    def value_field(self):
        """Proxy for Input tab's value_field."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def get(self):
                return self.widget.text()
            def clear(self):
                self.widget.clear()
        return Proxy(self.input_tab.value_field)

    @property
    def notes_field(self):
        """Proxy for Input tab's notes_field."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def get(self):
                return self.widget.text()
            def clear(self):
                self.widget.clear()
        return Proxy(self.input_tab.notes_field)

    @property
    def narrative_intention_field(self):
        """Proxy for Input tab's narrative_intention_field."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def get(self, start=None, end=None):
                # Tkinter's get("1.0", tk.END) expects start and end indices; QTextEdit.toPlainText() returns full text
                return self.widget.toPlainText().strip()
            def setPlainText(self, text):
                self.widget.setPlainText(text)
        return Proxy(self.input_tab.narrative_intention_field)

    @property
    def emotion_listbox(self):
        """Proxy for Input tab's emotion_listbox."""
        class Proxy:
            def __init__(self, widget):
                self.widget = widget
            def curselection(self):
                # Tkinter's curselection returns indices of selected items
                selected_indices = [index for index in range(self.widget.count()) if self.widget.item(index).isSelected()]
                return selected_indices
            def get(self, index):
                return self.widget.item(index).text()
        return Proxy(self.input_tab.emotion_listbox)

    def start_banner_animation(self):
        self.width = 50
        self.cycle_speed = 0.5
        self.stable_display_time = 4
        self.fade_steps = 60  # For ~120 FPS
        self.colors = ["#FF66CC", "#A77BCA", "#D7BFE6", "#663399", "#FF3399", "#FFFFFF"]  # Twilight Sparkle-inspired colors
        self.current_color_idx = 0
        self.fade_step = 0
        self.fade_in = True
        self.timer = QTimer()
        self.timer.timeout.connect(self.fade_and_color_cycle_banner)
        self.timer.start(int((self.cycle_speed / self.fade_steps) * 1000))

    def fade_and_color_cycle_banner(self):
        try:
            message = self.core.banner_messages[self.core.banner_index % len(self.core.banner_messages)]
            color = self.colors[self.current_color_idx % len(self.colors)]
            
            if self.fade_in:
                brightness = self.fade_step / self.fade_steps
                r = int(int(color[1:3], 16) * brightness)
                g = int(int(color[3:5], 16) * brightness)
                b = int(int(color[5:7], 16) * brightness)
                faded_color = f"#{r:02x}{g:02x}{b:02x}"
                self.banner_label.setText(message.center(self.width))
                self.banner_label.setStyleSheet(f"background-color: {self.core.config.get('bg_color', '#2E1A47')}; color: {faded_color}; font-family: 'Arial', sans-serif; font-size: 14px; font-weight: bold; padding: 5px;")
                self.fade_step += 1
                if self.fade_step >= self.fade_steps:
                    self.fade_in = False
                    self.timer.setInterval(int(self.stable_display_time * 1000))
            else:
                brightness = self.fade_step / self.fade_steps
                r = int(int(color[1:3], 16) * brightness)
                g = int(int(color[3:5], 16) * brightness)
                b = int(int(color[5:7], 16) * brightness)
                faded_color = f"#{r:02x}{g:02x}{b:02x}"
                self.banner_label.setText(message.center(self.width))
                self.banner_label.setStyleSheet(f"background-color: {self.core.config.get('bg_color', '#2E1A47')}; color: {faded_color}; font-family: 'Arial', sans-serif; font-size: 14px; font-weight: bold; padding: 5px;")
                self.fade_step -= 1
                if self.fade_step <= 0:
                    self.fade_in = True
                    self.core.banner_index += 1
                    self.current_color_idx += 1
                    self.fade_step = 0
                    self.timer.setInterval(int((self.cycle_speed / self.fade_steps) * 1000))
        except Exception as e:
            print(f"Error in banner animation: {e}")
            raise

    def setup_observer_tabs(self):
        print("Setting up Input tab...")
        try:
            self.input_tab = InputTab(self.core)
            self.tabs.addTab(self.input_tab, "Input")
        except Exception as e:
            print(f"Error setting up Input tab: {e}")
            raise

        print("Setting up Feedback tab...")
        try:
            self.feedback_tab = FeedbackTab(self.core)
            self.tabs.addTab(self.feedback_tab, "Feedback")
        except Exception as e:
            print(f"Error setting up Feedback tab: {e}")
            raise

        print("Setting up Narrative tab...")
        try:
            self.narrative_tab = NarrativeTab(self.core)
            self.tabs.addTab(self.narrative_tab, "Narrative")
        except Exception as e:
            print(f"Error setting up Narrative tab: {e}")
            raise

        print("Setting up History tab...")
        try:
            self.history_tab = HistoryTab(self.core)
            self.tabs.addTab(self.history_tab, "History")
        except Exception as e:
            print(f"Error setting up History tab: {e}")
            raise

        print("Setting up Rituals tab...")
        try:
            self.rituals_tab = RitualsTab(self.core)
            self.tabs.addTab(self.rituals_tab, "Rituals")
        except Exception as e:
            print(f"Error setting up Rituals tab: {e}")
            raise

        print("Setting up Symbolic Echoes tab...")
        try:
            self.symbolic_echoes_tab = SymbolicEchoesTab(self.core)
            self.tabs.addTab(self.symbolic_echoes_tab, "Symbolic Echoes")
        except Exception as e:
            print(f"Error setting up Symbolic Echoes tab: {e}")
            raise

    def update_ui_elements(self, elements):
        try:
            if hasattr(self, "input_tab"):
                self.input_tab.update_ui_elements(elements)
            if hasattr(self, "feedback_tab"):
                self.feedback_tab.update_ui_elements(elements)
            if hasattr(self, "narrative_tab"):
                self.narrative_tab.update_ui_elements(elements)
            if hasattr(self, "history_tab"):
                self.history_tab.update_ui_elements(elements)
            if hasattr(self, "rituals_tab"):
                self.rituals_tab.update_ui_elements(elements)
            if hasattr(self, "symbolic_echoes_tab"):
                self.symbolic_echoes_tab.update_ui_elements(elements)
        except Exception as e:
            print(f"Error in update_ui_elements: {e}")
            raise

if __name__ == "__main__":
    print("Starting application...")
    app = QApplication(sys.argv)
    print("Creating MainUI instance...")
    try:
        window = MainUI()
        print("Showing window...")
        window.show()
        print("Starting event loop...")
        sys.exit(app.exec_())
    except Exception as e:
        print(f"Application failed: {e}")
        sys.exit(1)