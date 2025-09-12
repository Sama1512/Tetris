import json
params = {
    "holes": 0.8,
    "height": 0.5,
    "bumpiness": 0.3,
    "ren": 1.0,
    "b2b": 1.2
}
with open("config/ai_params.json", "w") as f:
    json.dump(list(params.values()), f, indent=2)