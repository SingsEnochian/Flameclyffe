using UnityEngine;
using UnityEngine.EventSystems;

namespace Starwell.SpatialPortal
{
    public sealed class PortalInputController : MonoBehaviour
    {
        [SerializeField] private Camera arCamera;
        [SerializeField] private PortalPlacementController placementController;
        [SerializeField] private LayerMask hotspotLayers = ~0;
        [SerializeField, Min(0.1f)] private float maximumRayDistance = 20.0f;

        private void Awake()
        {
            if (arCamera == null)
            {
                arCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (arCamera == null || placementController == null || !placementController.IsPlaced)
            {
                return;
            }

            if (!TryGetPressPosition(out Vector2 screenPosition, out int pointerId))
            {
                return;
            }

            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject(pointerId))
            {
                return;
            }

            Ray ray = arCamera.ScreenPointToRay(screenPosition);
            if (!Physics.Raycast(ray, out RaycastHit hit, maximumRayDistance, hotspotLayers, QueryTriggerInteraction.Collide))
            {
                return;
            }

            PortalHotspot hotspot = hit.collider.GetComponentInParent<PortalHotspot>();
            hotspot?.Activate();
        }

        private static bool TryGetPressPosition(out Vector2 screenPosition, out int pointerId)
        {
            if (Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);
                if (touch.phase == TouchPhase.Began)
                {
                    screenPosition = touch.position;
                    pointerId = touch.fingerId;
                    return true;
                }
            }

            if (Input.GetMouseButtonDown(0))
            {
                screenPosition = Input.mousePosition;
                pointerId = -1;
                return true;
            }

            screenPosition = default;
            pointerId = -1;
            return false;
        }
    }
}
