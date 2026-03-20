"""
Beam Cloud Deployment for Qwen3.5-9B LLM
Uses correct SDK v2 syntax with on_start and Volume caching
"""

from beam import endpoint, Image, Volume
import os

VOLUME_PATH = "./model_weights"


def load_model():
    """Load model once per container lifecycle to avoid reloading on every request"""
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    import torch
    
    model_id = "huihui-ai/Qwen2.5-7B-Instruct-abliterated"
    
    print(f"Loading tokenizer from {model_id}...")
    tokenizer = AutoTokenizer.from_pretrained(
        model_id, 
        cache_dir=VOLUME_PATH,
        use_fast=False
    )
    
    print(f"Loading model from {model_id}...")
    # Use BitsAndBytesConfig for 4-bit quantization
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        model_id, 
        quantization_config=quantization_config,
        device_map="auto", 
        cache_dir=VOLUME_PATH
    )
    
    print("Model loaded successfully!")
    return {"model": model, "tokenizer": tokenizer}


@endpoint(
    name="private-qwen3.5-9b",
    image=Image(python_version="python3.11")
        .add_python_packages([
            "transformers",
            "torch",
            "bitsandbytes",
            "accelerate",
            "protobuf",
            "sentencepiece",
            "tiktoken",
            "tokenizers"
        ])
        .add_commands([
            "pip install sentencepiece tiktoken tokenizers --upgrade"
        ]),
    secrets=["HF_TOKEN"],
    gpu="RTX4090",
    cpu=2,
    memory="16Gi",
    keep_warm_seconds=0,
    on_start=load_model,
    checkpoint_enabled=True,
    volumes=[Volume(name="model-weights", mount_path=VOLUME_PATH)],
)
def generate(context, **inputs):
    import torch
    """
    Main inference endpoint
    
    Args:
        context: Beam context with on_start_value containing loaded model
        **inputs: Expected keys are 'prompt' (str) and 'history' (list of dicts)
    
    Returns:
        dict with 'response' key containing the generated text
    """
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
    
    # Extract only the assistant's response (remove the prompt)
    if "assistant" in messages[-1].get("role", ""):
        # If there's a system message, find where the assistant starts
        assistant_start = response.find("<|assistant|>")
        if assistant_start != -1:
            response = response[assistant_start + len("<|assistant|>"):].strip()
    
    return {"response": response}


# Alternative: vLLM Integration (3-5x faster inference)
# Uncomment below and comment out above to use vLLM

"""
from beam import integrations

def create_vllm_app():
    vllm_args = integrations.VLLMArgs()
    vllm_args.model = "HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive"
    vllm_args.gpu_memory_utilization = 0.9
    vllm_args.tensor_parallel_size = 1
    
    vllm_app = integrations.VLLM(
        name="qwen-vllm",
        gpu="A10G",
        memory="16Gi",
        cpu=2,
        keep_warm_seconds=0,
        secrets=["HF_TOKEN"],
        vllm_args=vllm_args
    )
    
    return vllm_app

# To deploy with vLLM:
# beam deploy app.py:create_vllm_app
"""
