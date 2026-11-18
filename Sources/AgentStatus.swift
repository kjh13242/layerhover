// Claude가 Figma 파일을 고치고 있는지 알아낸다. 두 군데를 본다.
//  1. Figma 화면의 "Agents, N agent" 표시 (AI 에이전트가 파일에 연결돼 있을 때 Figma가 띄운다)
//  2. Claude Code 훅이 남기는 상태 파일 (어떤 도구를 쓰는 중인지까지 알 수 있다)
//     ~/Library/Application Support/Layerhover/claude-status.json  {"state":"working","tool":"…","at":초}
//     훅 스크립트는 앱 안의 Contents/Resources/claude-hook.sh

import AppKit
import ApplicationServices

struct AgentState: Equatable {
    var figmaAgents = 0          // Figma가 보여 주는 연결된 에이전트 수
    var hookWorking = false      // Claude Code가 Figma 도구를 쓰는 중
    var tool: String?            // 마지막으로 쓴 도구 이름
    var active: Bool { figmaAgents > 0 || hookWorking }

    var detail: String {
        if hookWorking, let tool { return L("Claude가 작업 중: \(AgentState.friendly(tool))", "Claude is working: \(AgentState.friendly(tool))") }
        if hookWorking { return L("Claude가 작업 중", "Claude is working") }
        return L("이 파일에 AI 에이전트 \(figmaAgents)개 연결됨", "\(figmaAgents) AI agent(s) connected to this file")
    }

    /// mcp__서버__use_figma → use_figma
    static func friendly(_ tool: String) -> String {
        tool.components(separatedBy: "__").last ?? tool
    }
}

enum AgentStatus {
    static let statusFile = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/Layerhover/claude-status.json")
    static let stale: TimeInterval = 90   // 이보다 오래 소식이 없으면 끝난 것으로 본다 (훅이 Stop을 못 남긴 경우)

    private static var cache: (mtime: Date, working: Bool, tool: String?, at: Double)?

    /// 훅 상태 파일을 읽는다. 바뀌지 않았으면 다시 파싱하지 않는다.
    static func hook() -> (working: Bool, tool: String?) {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: statusFile.path),
              let mtime = attrs[.modificationDate] as? Date else { return (false, nil) }
        if cache?.mtime != mtime {
            guard let data = try? Data(contentsOf: statusFile),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return (false, nil) }
            cache = (mtime, (json["state"] as? String) == "working", json["tool"] as? String,
                     (json["at"] as? Double) ?? mtime.timeIntervalSince1970)
        }
        guard let c = cache else { return (false, nil) }
        let fresh = Date().timeIntervalSince1970 - c.at < stale
        return (c.working && fresh, c.tool)
    }

    /// 편집 화면에서 "Agents, 1 agent" 같은 버튼을 찾아 숫자를 읽는다. 없으면 0.
    /// 캔버스·레이어처럼 큰 부분은 건너뛴다.
    static func figmaAgents(in webArea: AXUIElement) -> Int {
        var budget = 900
        func walk(_ e: AXUIElement, _ depth: Int) -> Int? {
            guard depth <= 24, budget > 0 else { return nil }
            budget -= 1
            let id = e.domID
            if id == "fullscreen-root" || id == "hidden-input-activedescendant" || id == "left-panel-container" { return nil }
            if e.role == "AXPopUpButton" {
                let d = e.desc
                guard d.lowercased().hasPrefix("agents") || d.hasPrefix("에이전트") else { return nil }
                let digits = d.split(whereSeparator: { !$0.isNumber }).first.flatMap { Int($0) }
                return digits ?? 1
            }
            if hasClass(e.domClasses, "web_stacking--layer") || hasClass(e.domClasses, "positioned_design_toolbelt") { return nil }
            for c in e.children { if let n = walk(c, depth + 1) { return n } }
            return nil
        }
        return walk(webArea, 0) ?? 0
    }
}
