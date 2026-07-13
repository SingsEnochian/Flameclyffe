using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace Starwell.SpatialPortal
{
    public sealed class PortalSceneController : MonoBehaviour
    {
        [Header("Portal surfaces")]
        [SerializeField] private Renderer interiorRenderer;
        [SerializeField] private Light portalLight;
        [SerializeField] private Transform motionRoot;
        [SerializeField] private bool reducedMotion;

        private readonly Dictionary<string, PortalSceneDefinition> scenes = new(StringComparer.Ordinal);
        private readonly MaterialPropertyBlock materialProperties = new();

        private PortalManifest manifest;
        private PortalSceneDefinition activeScene;

        public bool IsReady { get; private set; }
        public string ActiveSceneId => activeScene?.id ?? string.Empty;

        public event Action<PortalSceneDefinition> SceneChanged;

        private IEnumerator Start()
        {
            yield return LoadManifest();
        }

        private void Update()
        {
            if (motionRoot == null || activeScene?.motion == null)
            {
                return;
            }

            float speed = reducedMotion
                ? activeScene.motion.reducedMotionSpeed
                : activeScene.motion.speed;

            if (Mathf.Abs(speed) > 0.0001f)
            {
                motionRoot.Rotate(0.0f, speed * 20.0f * Time.deltaTime, 0.0f, Space.Self);
            }
        }

        public void SetReducedMotion(bool enabled)
        {
            reducedMotion = enabled;
        }

        public bool ActivateScene(string sceneId)
        {
            if (!IsReady || string.IsNullOrWhiteSpace(sceneId) || !scenes.TryGetValue(sceneId, out PortalSceneDefinition scene))
            {
                return false;
            }

            activeScene = scene;
            ApplyPalette(scene.palette);

            foreach (PortalHotspot hotspot in GetComponentsInChildren<PortalHotspot>(true))
            {
                hotspot.SetSelected(string.Equals(hotspot.SceneId, sceneId, StringComparison.Ordinal));
            }

            SceneChanged?.Invoke(scene);
            return true;
        }

        private IEnumerator LoadManifest()
        {
            string path = Path.Combine(Application.streamingAssetsPath, "starwell-portal-scenes.json");

            using UnityWebRequest request = UnityWebRequest.Get(path);
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"STARWELL portal manifest could not be loaded: {request.error}", this);
                yield break;
            }

            try
            {
                manifest = JsonUtility.FromJson<PortalManifest>(request.downloadHandler.text);
            }
            catch (Exception exception)
            {
                Debug.LogError($"STARWELL portal manifest is invalid JSON: {exception.Message}", this);
                yield break;
            }

            if (manifest?.scenes == null || manifest.scenes.Length == 0)
            {
                Debug.LogError("STARWELL portal manifest contains no scenes.", this);
                yield break;
            }

            scenes.Clear();
            foreach (PortalSceneDefinition scene in manifest.scenes)
            {
                if (scene == null || string.IsNullOrWhiteSpace(scene.id))
                {
                    continue;
                }

                scenes[scene.id] = scene;
            }

            foreach (PortalHotspot hotspot in GetComponentsInChildren<PortalHotspot>(true))
            {
                hotspot.Bind(this);
            }

            IsReady = true;

            string initialScene = scenes.ContainsKey(manifest.defaultSceneId)
                ? manifest.defaultSceneId
                : manifest.scenes[0].id;

            ActivateScene(initialScene);
        }

        private void ApplyPalette(PortalPalette palette)
        {
            if (palette == null)
            {
                return;
            }

            Color primary = ParseColour(palette.primary, Color.white);
            Color background = ParseColour(palette.background, Color.black);
            Color accent = ParseColour(palette.accent, primary);

            if (interiorRenderer != null)
            {
                interiorRenderer.GetPropertyBlock(materialProperties);
                materialProperties.SetColor("_BaseColor", background);
                materialProperties.SetColor("_Color", background);
                materialProperties.SetColor("_EmissionColor", primary * 1.2f);
                interiorRenderer.SetPropertyBlock(materialProperties);
            }

            if (portalLight != null)
            {
                portalLight.color = accent;
            }
        }

        private static Color ParseColour(string value, Color fallback)
        {
            return !string.IsNullOrWhiteSpace(value) && ColorUtility.TryParseHtmlString(value, out Color parsed)
                ? parsed
                : fallback;
        }
    }
}
