"""
Beam Cloud Deployment for Qwen3.5-9B LLM
- keep_warm_seconds=300: container stays alive 5 min between requests (CRITICAL for credit savings)
- RTX4090: 24GB VRAM, sufficient for 9B at 4-bit (uses ~5-6GB)
- on_start: model loaded ONCE per container lifecycle, not per request
"""

from beam import endpoint, Image, Volume
import os

VOLUME_PATH = "./model_weights"


def _get_candidate_model_ids():
    """Return ordered model IDs to try, from env override to safe defaults."""
    env_model_id = os.getenv("HF_MODEL_ID", "").strip()
    candidates = []

    if env_model_id:
        candidates.append(env_model_id)

    # Valid public fallback to avoid startup crash if env model is wrong.
    fallback_id = "Qwen/Qwen2.5-7B-Instruct"
    if fallback_id not in candidates:
        candidates.append(fallback_id)

    return candidates


def load_model():
    """Load model once per container lifecycle to avoid reloading on every request"""
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    import torch

    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )

    last_error = None
    candidate_model_ids = _get_candidate_model_ids()

    for model_id in candidate_model_ids:
        try:
            print(f"[STARTUP] Loading tokenizer from {model_id}...")
            tokenizer = AutoTokenizer.from_pretrained(
                model_id,
                cache_dir=VOLUME_PATH,
                trust_remote_code=True
            )

            print(f"[STARTUP] Loading model from {model_id} with 4-bit quantization...")
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                quantization_config=quantization_config,
                device_map="auto",
                cache_dir=VOLUME_PATH,
                trust_remote_code=True
            )

            print(f"[STARTUP] Model loaded successfully from {model_id}. Container is warm.")
            return {"model": model, "tokenizer": tokenizer, "model_id": model_id}
        except Exception as exc:
            last_error = exc
            print(f"[STARTUP] Failed to load model {model_id}: {exc}")

    raise RuntimeError(
        "Could not load any configured HF model IDs. "
        f"Tried: {candidate_model_ids}. "
        "Set HF_MODEL_ID to a valid repository and ensure HF_TOKEN has access if required."
    ) from last_error


@endpoint(
    name="qwen35-9b",
    image=Image(python_version="python3.11")
        .add_python_packages([
            "transformers>=4.51.0",
            "torch",
            "bitsandbytes",
            "accelerate",
            "sentencepiece",
            "tiktoken",
            "tokenizers"
        ])
        .add_commands(["pip install transformers --upgrade"]),
    gpu="RTX4090",
    cpu=2,
    memory="24Gi",
    # CRITICAL FIX: keep container alive for 5 minutes between requests.
    # Without this, every request triggers a cold start (model reload = $$$)
    keep_warm_seconds=300,
    on_start=load_model,
    secrets=["HF_TOKEN"],
    volumes=[Volume(name="model-weights", mount_path=VOLUME_PATH)],
)
def generate(context, **inputs):
    """Main inference endpoint — model is already loaded from on_start"""
    import torch
    
    # Access the pre-loaded model (no reloading cost)
    model = context.on_start_value["model"]
    tokenizer = context.on_start_value["tokenizer"]
    model_id = context.on_start_value.get("model_id", "unknown")
    
    # Get input parameters
    history = inputs.get("history", [])
    prompt = inputs.get("prompt", "")
    temperature = float(inputs.get("temperature", 0.7))
    max_new_tokens = int(inputs.get("max_tokens", 512))
    
    if not prompt:
        return {"response": "", "error": "No prompt provided"}
    
    # Build message list: optional system prompt + history + current user message
    messages = []
    
    system_prompt = inputs.get("system_prompt", "You are a helpful, smart, and friendly AI assistant.")
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    # Add conversation history (already formatted as list of dicts)
    for msg in history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            messages.append(msg)
    
    # Add the current user message
    messages.append({"role": "user", "content": prompt})
    
    # Apply Qwen chat template
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    # Tokenize and move to GPU
    enc = tokenizer([text], return_tensors="pt").to("cuda")
    input_length = enc["input_ids"].shape[1]
    
    # Generate
    with torch.no_grad():
        out = model.generate(
            **enc,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1,
        )
    
    # CRITICAL FIX: decode ONLY the newly generated tokens (not the full prompt)
    generated_tokens = out[0][input_length:]
    response = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
    
    print(f"[INFERENCE] Generated {len(generated_tokens)} tokens from {model_id}.")
    
    return {"response": response}
