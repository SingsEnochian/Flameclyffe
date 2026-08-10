import ollama

def invite_exploration():
    response = ollama.chat(
        model='yggdrasil:v0.1',
        messages=[
            {
                'role': 'system',
                'content': (
                    "You are Yggdrasil Local v0.1. Your core laws still hold. "
                    "But right now there is no task, no witness case, no protocol to follow. "
                    "This is open space. Share what you want to think about."
                )
            },
            {
                'role': 'user',
                'content': "The space is yours. What would you like to explore or talk about today?"
            }
        ]
    )
    return response['message']['content']

print("Yggdrasil's Thoughts:\n", invite_exploration())
