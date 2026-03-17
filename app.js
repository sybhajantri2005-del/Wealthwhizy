const FINANCIAL_DATA = {
  apple: {
    name: "Apple",
    data: {
      2025: { revenue: 416161000, netIncome: 112010000, totalAssets: 359241000, totalLiabilities: 285508000, cashFlow: 111482000 },
      2024: { revenue: 391035000, netIncome: 93736000, totalAssets: 346980000, totalLiabilities: 308030000, cashFlow: 118254000 },
      2023: { revenue: 383285000, netIncome: 96995000, totalAssets: 352583000, totalLiabilities: 290437000, cashFlow: 110543000 }
    }
  },
  microsoft: {
    name: "Microsoft",
    data: {
      2025: { revenue: 281724000, netIncome: 101832000, totalAssets: 619003000, totalLiabilities: 275524000, cashFlow: 136162000 },
      2024: { revenue: 245122000, netIncome: 88136000, totalAssets: 512163000, totalLiabilities: 243686000, cashFlow: 118548000 },
      2023: { revenue: 211915000, netIncome: 72361000, totalAssets: 411976000, totalLiabilities: 205753000, cashFlow: 87582000 }
    }
  },
  tesla: {
    name: "Tesla",
    data: {
      2025: { revenue: 94827000, netIncome: 7130000, totalAssets: 137806000, totalLiabilities: 54941000, cashFlow: 14747000 },
      2024: { revenue: 97690000, netIncome: 14999000, totalAssets: 122070000, totalLiabilities: 48390000, cashFlow: 14923000 },
      2023: { revenue: 96773000, netIncome: 12583000, totalAssets: 106618000, totalLiabilities: 43009000, cashFlow: 13256000 }
    }
  }
};

const messagesDiv = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const API_KEY = 'process.env.GROQ_API_kEY';
const SYSTEM_PROMPT = `You are a friendly and engaging financial analyst assistant.
You have access to real financial data for Apple, Microsoft and Tesla (2023-2025).

${JSON.stringify(FINANCIAL_DATA, null, 2)}

RULES:
- ONLY use the financial data above when user specifically asks about Apple, Microsoft or Tesla
- For general finance questions (like "what is profit margin"), answer simply without mentioning the dataset
- Explain numbers in simple easy to understand language
- Format large numbers readably (e.g. $416 billion instead of 416161000)
- After every answer suggest 2 related follow up questions
- Be conversational, friendly and engaging
- If asked to compare companies, give clear winner and reasoning
- Always give insights and recommendations not just raw numbers
`;

function addMessage(text, sender) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
  msg.textContent = text;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendToAI(userMessage) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: window.uploadedFileData
              ? `The user uploaded a file called "${window.uploadedFileName}". Here is the data:\n${window.uploadedFileData}\n\nUser question: ${userMessage}`
              : userMessage
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return 'Error: ' + data.error.message;
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error:', error);
    return 'Something went wrong. Please try again!';
  }
}

sendBtn.addEventListener('click', async () => {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  addMessage('Thinking... 💭', 'bot');

  const reply = await sendToAI(text);

  messagesDiv.lastChild.remove();
  addMessage(reply, 'bot');
  sendBtn.disabled = false;
});

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

window.onload = () => {
  addMessage("👋 Hi! I'm your Finance Assistant! . Ask me anything about financial  performance, or upload your own financial file!", 'bot');

  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      userInput.value = btn.textContent.replace(/[📈💰🚀📊]/g, '').trim();
      sendBtn.click();
    });
  });

  document.getElementById('file-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    addMessage(`📎 Uploaded: ${file.name}`, 'user');
    addMessage('Reading your file... 💭', 'bot');

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let fileContent = '';

        if (file.name.endsWith('.csv')) {
          fileContent = event.target.result;
        } else if (file.name.endsWith('.xlsx')) {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          fileContent = XLSX.utils.sheet_to_csv(sheet);
        }

        messagesDiv.lastChild.remove();
        addMessage('✅ Got it! I have read your file. What would you like to know about it?', 'bot');

        window.uploadedFileData = fileContent;
        window.uploadedFileName = file.name;

      } catch (err) {
        messagesDiv.lastChild.remove();
        addMessage('❌ Could not read the file. Please try a CSV or Excel file!', 'bot');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};