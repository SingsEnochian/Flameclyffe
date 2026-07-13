using UnityEngine;

namespace Starwell.SpatialPortal
{
    [RequireComponent(typeof(Collider))]
    public sealed class PortalHotspot : MonoBehaviour
    {
        [SerializeField] private string sceneId = string.Empty;
        [SerializeField] private Renderer focusRenderer;
        [SerializeField] private float selectedScale = 1.18f;
        [SerializeField] private Color idleColour = new(0.55f, 0.75f, 0.72f, 0.65f);
        [SerializeField] private Color selectedColour = new(0.95f, 0.79f, 0.42f, 1.0f);

        private readonly MaterialPropertyBlock materialProperties = new();
        private PortalSceneController controller;
        private Vector3 baseScale;

        public string SceneId => sceneId;

        private void Awake()
        {
            baseScale = transform.localScale;
            if (focusRenderer == null)
            {
                focusRenderer = GetComponentInChildren<Renderer>();
            }
        }

        public void Bind(PortalSceneController sceneController)
        {
            controller = sceneController;
        }

        public void Activate()
        {
            if (controller == null)
            {
                controller = GetComponentInParent<PortalSceneController>();
            }

            if (controller == null || !controller.ActivateScene(sceneId))
            {
                Debug.LogWarning($"STARWELL hotspot could not activate scene '{sceneId}'.", this);
            }
        }

        public void SetSelected(bool selected)
        {
            transform.localScale = selected ? baseScale * selectedScale : baseScale;

            if (focusRenderer == null)
            {
                return;
            }

            focusRenderer.GetPropertyBlock(materialProperties);
            Color colour = selected ? selectedColour : idleColour;
            materialProperties.SetColor("_BaseColor", colour);
            materialProperties.SetColor("_Color", colour);
            materialProperties.SetColor("_EmissionColor", colour);
            focusRenderer.SetPropertyBlock(materialProperties);
        }
    }
}
