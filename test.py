import os
from anthropic import Anthropic
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),  # This is the default and can be omitted
)
page = client.beta.models.list()
page = page.data[0]
print(page.id)