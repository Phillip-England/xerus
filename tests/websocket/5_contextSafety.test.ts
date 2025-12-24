import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const WS_URL = BaseURL.replace("http", "ws");

test("WS Safety: Service state should NOT leak between messages", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/safety/context`);

  const response = await new Promise<string[]>((resolve, reject) => {
    const logs: string[] = [];
    
    socket.onopen = () => {
      // 1. Set data in the service
      socket.send("SET:SECRET_DATA");
    };

    socket.onmessage = (event) => {
      const msg = String(event.data);
      logs.push(msg);

      if (msg.startsWith("OK:SET")) {
        // 2. Immediately check if that data exists in the NEXT message context
        socket.send("CHECK");
      } else if (msg.startsWith("VALUE:")) {
        socket.close();
        resolve(logs);
      }
    };

    socket.onerror = (e) => reject(e);
  });

  // Verify the sequence
  expect(response[0]).toBe("OK:SET:SECRET_DATA");
  // CRITICAL: The value must be EMPTY. If it is "SECRET_DATA", the context leaked.
  expect(response[1]).toBe("VALUE:EMPTY");
});

test("WS Safety: Message content should be perfectly isolated", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/safety/isolation`);
  
  const response = await new Promise<string[]>((resolve) => {
    const logs: string[] = [];
    socket.onopen = () => {
      socket.send("A"); // Short
      socket.send("BBB"); // Medium
      socket.send("A"); // Short again (check for overwrites/artifacts)
    };

    let count = 0;
    socket.onmessage = (event) => {
      logs.push(String(event.data));
      count++;
      if (count === 3) {
        socket.close();
        resolve(logs);
      }
    };
  });

  expect(response[0]).toBe("ECHO:A");
  expect(response[1]).toBe("ECHO:BBB");
  expect(response[2]).toBe("ECHO:A"); // Should not be "ECHO:AB" or similar
});