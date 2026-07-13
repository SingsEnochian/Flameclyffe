using System;

namespace Starwell.SpatialPortal
{
    [Serializable]
    public sealed class PortalManifest
    {
        public string schemaVersion = "0.1.0";
        public string defaultSceneId = "observatory";
        public PortalSceneDefinition[] scenes = Array.Empty<PortalSceneDefinition>();
    }

    [Serializable]
    public sealed class PortalSceneDefinition
    {
        public string id = string.Empty;
        public string displayName = string.Empty;
        public string glyph = string.Empty;
        public string accessibilityLabel = string.Empty;
        public PortalPalette palette = new();
        public PortalMotion motion = new();
        public PortalAssets assets = new();
        public string[] capabilities = Array.Empty<string>();
    }

    [Serializable]
    public sealed class PortalPalette
    {
        public string primary = "#E7C477";
        public string secondary = "#8CCAC0";
        public string background = "#11131A";
        public string accent = "#B65F3D";
    }

    [Serializable]
    public sealed class PortalMotion
    {
        public string profile = "stillness";
        public float speed = 0.0f;
        public float reducedMotionSpeed = 0.0f;
    }

    [Serializable]
    public sealed class PortalAssets
    {
        public string interiorTextureKey = string.Empty;
        public string ambientAudioKey = string.Empty;
    }
}
