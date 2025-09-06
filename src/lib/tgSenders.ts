// src/lib/tgSenders.ts
export function sendTelegramViaImageGET(botToken: string, chatId: string, text: string) {
    const url =
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage` +
      `?chat_id=${encodeURIComponent(chatId)}` +
      `&parse_mode=HTML` +
      `&text=${encodeURIComponent(text)}`;
  
    // CORS тут не нужен: загрузка картинки — навигационный запрос.
    const img = new Image();
    img.referrerPolicy = 'no-referrer'; // меньше утечек
    img.src = url;
  
    // Мы не узнаем статус, но запрос уйдёт.
  }
  
  // src/lib/tgSenders.ts (добавь вторую функцию)
export function sendTelegramViaHiddenFormPOST(botToken: string, chatId: string, text: string) {
    const action = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
  
    // создаём скрытый iframe-таргет
    let iframe = document.getElementById('tg_iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'tg_iframe';
      iframe.id = 'tg_iframe';
      document.body.appendChild(iframe);
    }
  
    // создаём форму
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = 'tg_iframe';
    form.style.display = 'none';   
  
    const add = (n: string, v: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = n;
      input.value = v;
      form.appendChild(input);
    };
  
    add('chat_id', chatId);
    add('parse_mode', 'HTML');
    add('text', text);
  
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 2000);
  }
  