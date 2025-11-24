import { useEffect } from "react";

declare global {
    interface Window {
        whomadethis?: () => void;
    }
}

// --- Hidden Easter Egg Component ---
export function EasterEgg() {
    useEffect(() => {
        // Shh, it's a secret. If you're reading this, you're either very curious
        // or you're me. Either way, hi! This little trick keeps the strings
        // out of the casual source code search.
        window.whomadethis = () => {
            // Helper to decode Base64 on the fly.
            const d = (s: string) => atob(s);

            const x7f = d("UmFuaXQgTWFuaWs=");
            const y2k = d("aHR0cHM6Ly9naXRodWIuY29tLw==");
            const z9m = d("aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2luLw==");
            const p4q = d("UmFuaXRNYW5paw==");
            const r8s = d("cmFuaXQtbWFuaWs=");
            const t1u = d("VGhhbmtzIGZvciBjaGVja2luZyBvdXQgTXVsdGlOb3RlcyE=");

            // A refined style palette for a direct, impressive console output.
            const styles = {
                title: "font-size: 20px; font-weight: bold; padding: 8px 0; background: linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Courier New', monospace;",
                subtitle:
                    "color: #ff6b6b; font-weight: bold; font-size: 14px; font-family: 'Courier New', monospace;",
                label: "color: #4ecdc4; font-weight: bold; font-family: 'Courier New', monospace;",
                link: "color: #45b7d1; text-decoration: underline; font-family: 'Courier New', monospace;",
                message:
                    "color: #96ceb4; font-style: italic; font-family: 'Courier New', monospace;",
                secret: "color: #ffd93d; font-weight: bold; font-family: 'Courier New', monospace;",
            };

            // The grand reveal, structured for immediate impact with a dash of humor.
            console.log(
                `%c🎉 You found the secret developer lair! 🎉\n\n%c👋 Hi, I'm ${x7f} - The Code Wizard 🧙‍♂️\n\n%c🔗 GitHub: %c${y2k}${p4q}\n%c🔗 LinkedIn: %c${z9m}${r8s}\n\n%c🤫 Psst... If you're seeing this, you're either:\n   • A fellow developer with excellent detective skills\n   • My future self debugging something\n   • Just really bored and poking around\n\n%c${t1u} (And thanks for not breaking anything! 😉)`,
                styles.title,
                styles.subtitle,
                styles.label,
                styles.link,
                styles.label,
                styles.link,
                styles.secret,
                styles.message,
            );
        };

        // Cleanup the function when the component unmounts.
        return () => {
            delete window.whomadethis;
        };
    }, []);

    return null;
}
