---
title: "Local LLM inference on a 32 GB GPU"
summary: "A single AMD workstation GPU serves chat, agents and dictation cleanup entirely on my own hardware, with nothing sent to a cloud."
order: 2
stack: ["AMD Radeon AI PRO R9700", "llama-swap", "llama.cpp", "Open WebUI", "Docker"]
metric: "32 GB VRAM, 6 models"
---
I built a private inference stack around an AMD Radeon AI PRO R9700 with 32 GB of VRAM, passed through to a dedicated container named todd (AI inference).

llama-swap sits in front as an OpenAI-compatible endpoint and starts one container per model on demand. A main chat model and a small fast model stay loaded together, while an image generator and an embeddings model load only when asked. Open WebUI gives me a chat interface, and my agents and local dictation apps call the same endpoint.

The tradeoff I like most is the fallback. The primary engine is much faster, but I also keep a llama.cpp Vulkan route for the same model, accepting roughly a quarter of the speed in exchange for not depending on one runtime. Loading the big image model evicts the chat model, so I treat swaps as a cost and plan around them.

The dictation clients clean up my speech through this endpoint in a fraction of a second, with a raw-text fallback if it is unreachable. Everything stays on my network.
