using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace Starwell.SpatialPortal
{
    public sealed class PortalPlacementController : MonoBehaviour
    {
        [Header("AR Foundation")]
        [SerializeField] private ARRaycastManager raycastManager;
        [SerializeField] private ARAnchorManager anchorManager;
        [SerializeField] private ARPlaneManager planeManager;
        [SerializeField] private Camera arCamera;

        [Header("Portal")]
        [SerializeField] private GameObject portalPrefab;
        [SerializeField, Min(0.0f)] private float wallOffsetMetres = 0.02f;

        private static readonly List<ARRaycastHit> Hits = new();

        private ARAnchor portalAnchor;
        private GameObject portalRoot;
        private bool placementInProgress;

        public bool IsPlaced => portalAnchor != null && portalRoot != null;

        private void Awake()
        {
            if (arCamera == null)
            {
                arCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (IsPlaced || placementInProgress || portalPrefab == null)
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

            TryPlacePortal(screenPosition);
        }

        public void ResetPlacement()
        {
            if (portalRoot != null)
            {
                Destroy(portalRoot);
                portalRoot = null;
            }

            if (portalAnchor != null)
            {
                if (anchorManager == null || !anchorManager.TryRemoveAnchor(portalAnchor))
                {
                    Debug.LogWarning("STARWELL could not remove the current AR anchor cleanly.", this);
                }

                portalAnchor = null;
            }

            if (planeManager != null)
            {
                planeManager.enabled = true;
                planeManager.SetTrackablesActive(true);
            }
        }

        private async void TryPlacePortal(Vector2 screenPosition)
        {
            if (raycastManager == null || anchorManager == null || arCamera == null)
            {
                Debug.LogError("STARWELL portal placement is missing an AR manager or camera reference.", this);
                return;
            }

            if (!raycastManager.Raycast(screenPosition, Hits, TrackableType.PlaneWithinPolygon))
            {
                return;
            }

            placementInProgress = true;

            Pose hitPose = Hits[0].pose;
            Vector3 towardsViewer = arCamera.transform.position - hitPose.position;
            towardsViewer.y = 0.0f;

            if (towardsViewer.sqrMagnitude < 0.0001f)
            {
                towardsViewer = -arCamera.transform.forward;
                towardsViewer.y = 0.0f;
            }

            Quaternion portalRotation = Quaternion.LookRotation(towardsViewer.normalized, Vector3.up);
            Vector3 portalPosition = hitPose.position + towardsViewer.normalized * wallOffsetMetres;
            Pose portalPose = new(portalPosition, portalRotation);

            var result = await anchorManager.TryAddAnchorAsync(portalPose);
            placementInProgress = false;

            if (!result.status.IsSuccess() || result.value == null)
            {
                Debug.LogWarning($"STARWELL could not create an AR anchor: {result.status}", this);
                return;
            }

            portalAnchor = result.value;
            portalRoot = Instantiate(portalPrefab, portalAnchor.transform);
            portalRoot.name = "STARWELL Portal Root";
            portalRoot.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);

            if (planeManager != null)
            {
                planeManager.SetTrackablesActive(false);
                planeManager.enabled = false;
            }
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
