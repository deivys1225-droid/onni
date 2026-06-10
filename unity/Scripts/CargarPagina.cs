using System.Collections;
using UnityEngine;

/**
 * Carga la URL de la app web (ViveVR) dentro de un WebView en pantalla.
 *
 * Requisito: el paquete *unity-webview* (p. ej. https://github.com/gree/unity-webview)
 * debe estar en el proyecto Unity. Ese plugin añade la clase `WebViewObject` en
 * `Assets/Plugins/` (o la ruta que indique el paquete). Sin ese plugin, el tipo
 * WebViewObject no existirá y Unity marcará error.
 *
 * Si usas UPM/Asset Store, importa el plugin primero; no hace falta un `using`
 * adicional: WebViewObject vive en el namespace global.
 */
public class CargarPagina : MonoBehaviour
{
    [Header("Página a mostrar (HTTPS recomendado)")]
    [SerializeField] private string url = "https://localhost:5173/";

    [Header("Márgenes en px (arriba / izq / ancho / alto) — ajusta según UI")]
    [SerializeField] private int topMargin = 80;
    [SerializeField] private int leftMargin = 0;
    [SerializeField] private int rightOrWidth = 0;
    [SerializeField] private int bottomMargin = 0;

    private WebViewObject webView;

    private void OnDestroy()
    {
        if (webView != null)
        {
            Destroy(webView.gameObject);
        }
    }

    private IEnumerator Start()
    {
        // Patrón habitual del sample oficial de gree/unity-webview
        var go = new GameObject("WebViewObject");
        go.transform.SetParent(transform, false);
        webView = go.AddComponent<WebViewObject>();
        // Orden de parámetros según gree/unity-webview: cb, err, httpErr, ld, started, …
        webView.Init(
            cb: (string msg) => { Debug.Log($"[WebView] JS → {msg}"); },
            err: (string msg) => { Debug.LogError($"[WebView] error: {msg}"); },
            httpErr: (string msg) => { Debug.LogError($"[WebView] http: {msg}"); },
            ld: (string urlLoaded) => { Debug.Log($"[WebView] loaded: {urlLoaded}"); },
            started: (string urlStarted) => { Debug.Log($"[WebView] started: {urlStarted}"); },
            enableWKWebView: true
        );

        webView.SetMargins(leftMargin, topMargin, rightOrWidth, bottomMargin);
        webView.SetTextZoom(100);
        webView.LoadURL(url);
        webView.SetVisibility(true);

        yield break;
    }
}
