// app/(content-header)/chatbot/components/emulator/runners/runApiNode.ts
import type { AnyNode } from "../../../types";
import { resolveTemplate } from "../../../utils";

export async function runApiNode(
  node: AnyNode,
  deps: {
    slotValues: Record<string, any>;
    formValues: Record<string, any>;
    setSlotValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  },
) {
  const { slotValues, formValues, setSlotValues } = deps;

  try {
    const { url, method, headers, body, responseMapping } = node.data ?? {};
    const ctx = { ...slotValues, ...formValues };

    const resolvedUrl = resolveTemplate(String(url ?? ""), ctx);
    const resolvedBody = body ? resolveTemplate(String(body), ctx) : undefined;

    let parsedHeaders: Record<string, any> = {};
    try {
      parsedHeaders = headers ? JSON.parse(headers) : {};
    } catch (e) {
      console.error("Header JSON parsing error:", e);
    }

    const options: any = { method: method || "GET", headers: parsedHeaders };
    if (String(options.method).toUpperCase() !== "GET" && resolvedBody) {
      options.body = resolvedBody;
    }

    const res = await fetch(resolvedUrl, options);
    const json = await res.json();

    if (Array.isArray(responseMapping)) {
      setSlotValues((prev: any) => {
        const next = { ...prev };
        responseMapping.forEach((m) => {
          next[m.slot] = json?.[m.path];
        });
        return next;
      });
    }

    return true;
  } catch (e) {
    console.error("API 실행 오류:", e);
    return false;
  }
}
