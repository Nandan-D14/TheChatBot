"""
Beam Cloud Deployment for Qwen3.5-9B LLM
Uses transformers with bfloat16 and latest version for Qwen3.5 support
"""

from beam import endpoint, Image, Volume
import os

VOLUME_PATH = "./model_weights"


def load_model():
    """Load model once per container lifecycle to avoid reloading on every request"""
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    model_id = "Qwen/Qwen3.5-9B"
    
    print(f"Loading tokenizer from {model_id}...")
    tokenizer = AutoTokenizer.from_pretrained(
        model_id, 
        cache_dir=VOLUME_PATH
    )
    
    print(f"Loading model from {model_id}...")
    # Use bfloat16 for Qwen3.5 (not float16)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, 
        torch_dtype=torch.bfloat16,
        device_map="auto", 
        load_in_4bit=True,
        cache_dir=VOLUME_PATH
    )
    
    print("Model loaded successfully!")
    return {"model": model, "tokenizer": tokenizer}


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
    keep_warm_seconds=0,
    on_start=load_model,
    secrets=["HF_TOKEN"],
    volumes=[Volume(name="model-weights", mount_path=VOLUME_PATH)],
)
def generate(context, **inputs):
    """Main inference endpoint"""
    import torch
    
    # Access the pre-loaded model from on_start
    model = context.on_start_value["model"]
    tokenizer = context.on_start_value["tokenizer"]
    
    # Get input parameters
    messages = inputs.get("history", [])
    prompt = inputs.get("prompt", "")
    
    # Add current user message to history
    messages.append({"role": "user", "content": prompt})
    
    # Apply chat template for Qwen
    text = tokenizer.apply_chat_template(
        messages, 
        tokenize=False, 
        add_generation_prompt=True
    )
    
    # Tokenize
    enc = tokenizer([text], return_tensors="pt").to("cuda")
    
    # Generate
    with torch.no_grad():
        out = model.generate(
            **enc, 
            max_new_tokens=512,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Decode response
    response = tokenizer.decode(out[0], skip_special_tokens=True)
    
    return {"response": response}
