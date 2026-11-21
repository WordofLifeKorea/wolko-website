import UIKit
import WebKit
import Capacitor

/// 앱 첫 화면. 기본 화면 그대로 쓰되 앱 전용 도우미(WolkoAppPlugin)를 등록한다.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WolkoAppPlugin())
    }
}

/// 앱 전용 도우미.
/// - 모든 wolko.org 페이지가 열릴 때 사이트의 /wolko-app.js 를 불러 넣는다.
///   (내려받기 → 공유·저장 창, 같은 사이트 새 창 → 앱 안에서 열기 등은 그 파일이 맡는다.
///    그래서 그 동작을 고칠 때는 사이트만 고치면 되고 앱을 다시 낼 필요가 없다)
/// - printPage(): 지금 화면을 휴대폰 인쇄 창으로 보낸다. 인쇄 창이 닫힌 뒤에 끝났다고 알린다.
@objc(WolkoAppPlugin)
public class WolkoAppPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WolkoAppPlugin"
    public let jsName = "WolkoApp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printPage", returnType: CAPPluginReturnPromise)
    ]

    static let loader = """
    (function(){if(window.__wolkoAppLoader)return;window.__wolkoAppLoader=1;\
    if(location.protocol!=='https:'||!/(^|\\.)wolko\\.org$/.test(location.hostname))return;\
    var s=document.createElement('script');\
    s.src=location.origin+'/wolko-app.js?h='+Math.floor(Date.now()/36e5);\
    (document.head||document.documentElement).appendChild(s);})();
    """

    override public func load() {
        let script = WKUserScript(source: WolkoAppPlugin.loader, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        bridge?.webView?.configuration.userContentController.addUserScript(script)
    }

    @objc func printPage(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("화면을 찾지 못했습니다")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = (webView.title?.isEmpty == false) ? webView.title! : "WOLKO"
            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()
            controller.present(animated: true) { _, completed, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }
        }
    }
}
