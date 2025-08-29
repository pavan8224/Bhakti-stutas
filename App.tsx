
import React, { useState, useCallback, useRef } from 'react';
import { generateBackgroundImage, analyzeImageForTextPlacement, planImageGeneration } from './services/geminiService';

type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4';

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
    <p className="text-lg text-gray-300 text-center px-4">{message}</p>
  </div>
);

const DownloadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AspectRatioIcon: React.FC<{ ratio: AspectRatio }> = ({ ratio }) => {
  const styles = {
    '1:1': { width: '24px', height: '24px' },
    '9:16': { width: '18px', height: '32px' },
    '16:9': { width: '32px', height: '18px' },
    '3:4': { width: '24px', height: '32px' },
  };
  return <div className="border-2 border-current rounded-sm" style={styles[ratio]}></div>;
};


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>("!! श्री कृष्ण कहते हैं !! कुछ वक्त शांत रहकर गुजार लो पार्थ तुम्हारा वक्त नहीं तुम्हारा दौर आएगा, क्योंकि तुम्हारी कहानी का लेखक मैं खुद हूं..!!");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const examplePrompts = [
      "!! श्री कृष्ण कहते हैं !! कर्म करो, फल की चिंता मत करो। 🙏",
      "महादेव के भक्त, कैलाश के वासी। 🕉️ हर हर महादेव।",
      "रात की गहराई और चाँदनी, और लिखा हो 'खामोशी में भी एक आवाज़ है...'",
      "एक अकेला योद्धा सूर्यास्त को देख रहा है, और लिखा हो 'जंग अभी खत्म नहीं हुई है। 🔥'",
  ];

  const loadingMessages = [
    "AI कलाकार को दिव्य प्रेरणा दी जा रही है...",
    "कैनवास पर ब्रह्मांड के रंग घोले जा रहे हैं...",
    "आपकी कल्पना को एक आध्यात्मिक रूप दिया जा रहा है...",
    "AI को सुलेखन सिखाया जा रहा है...",
    "कलाकृति को अंतिम रूप दिया जा रहा है...",
  ];

  const handleGenerateImage = useCallback(async () => {
    if (!prompt) {
      setError('कृपया प्रॉम्प्ट फ़ील्ड भरें।');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    let currentMessageIndex = 0;
    const messageInterval = setInterval(() => {
        currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[currentMessageIndex]);
    }, 2500);


    try {
      setLoadingMessage(loadingMessages[0]);
      const { imagePrompt, hindiText, theme } = await planImageGeneration(prompt);

      setLoadingMessage(loadingMessages[1]);
      const base64Image = await generateBackgroundImage(imagePrompt, aspectRatio);

      setLoadingMessage(loadingMessages[2]);
      const analysis = await analyzeImageForTextPlacement(base64Image, hindiText, theme);

      const bgImage = new Image();
      bgImage.crossOrigin = "anonymous";
      bgImage.src = `data:image/jpeg;base64,${base64Image}`;

      bgImage.onload = () => {
        setLoadingMessage(loadingMessages[3]);
        const canvas = canvasRef.current;
        if (!canvas) {
            setError('Canvas element not found.');
            setIsLoading(false);
            return;
        }

        const maxWidth = 1080; 
        canvas.width = Math.min(bgImage.width, maxWidth);
        canvas.height = canvas.width / (bgImage.width / bgImage.height);


        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('कैनवास कॉन्टेक्स्ट नहीं मिल सका।');
          setIsLoading(false);
          return;
        }
        
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        const getFontDetails = (style: typeof analysis.fontStyle) => {
          switch (style) {
            case 'elegant-serif':
              return { family: '"Tiro Devanagari Hindi", serif', weight: '400' };
            case 'calligraphic':
              return { family: '"Kalam", cursive', weight: '700' };
            case 'bold-sans-serif':
            default:
              return { family: '"Noto Sans Devanagari", "Segoe UI Emoji", sans-serif', weight: '700' };
          }
        };
        
        const { family: fontFamily, weight: fontWeight } = getFontDetails(analysis.fontStyle);
        
        const baseFontSize = canvas.width * (analysis.fontSize / 100);
        const fontSize = Math.max(24, baseFontSize); // Increased minimum font size for readability
        
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxTextWidth = canvas.width * 0.9;
        const initialLines = analysis.hindiText.split('\n');
        const wrappedLines: string[] = [];

        initialLines.forEach(line => {
            let currentLine = '';
            const words = line.split(' ');
            if (words.length === 0) {
                wrappedLines.push('');
                return;
            }
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth && i > 0) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            wrappedLines.push(currentLine);
        });

        const x = canvas.width * (analysis.x / 100);
        const lineSpacing = fontSize * 1.4;
        const totalTextHeight = (wrappedLines.length - 1) * lineSpacing;
        const startY = (canvas.height * (analysis.y / 100)) - (totalTextHeight / 2);
        
        ctx.fillStyle = analysis.textColor || '#FFFFFF';
        
        ctx.shadowColor = analysis.shadowColor;
        ctx.shadowBlur = analysis.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        wrappedLines.forEach((line, index) => {
            const y = startY + (index * lineSpacing);
            ctx.fillText(line, x, y);
        });
        
        setLoadingMessage(loadingMessages[4]);
        const finalImageUrl = canvas.toDataURL('image/jpeg');
        setGeneratedImageUrl(finalImageUrl);
        setIsLoading(false);
      };

      bgImage.onerror = () => {
        setError('बैकग्राउंड इमेज लोड करने में विफल।');
        setIsLoading(false);
      };
    } catch (err) {
      setError(`एक त्रुटि हुई: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    } finally {
        clearInterval(messageInterval);
    }
  }, [prompt, aspectRatio]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <div className="w-full max-w-5xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-300">
            आध्यात्मिक इमेज जेनरेटर
          </h1>
          <p className="text-gray-400 mt-2">अपनी कल्पना को एक दिव्य कलाकृति में बदलें।</p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col space-y-6">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                  1. अपने विचार या शायरी लिखें
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="जैसे: !! श्री कृष्ण कहते हैं !! कर्म करो, फल की चिंता मत करो..."
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  2. फोटो का आकार चुनें
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['1:1', '9:16', '16:9', '3:4'] as AspectRatio[]).map(ratio => (
                        <button key={ratio} onClick={() => setAspectRatio(ratio)}
                            className={`flex flex-col items-center justify-center space-y-2 p-3 rounded-lg border-2 transition-all duration-200 ${aspectRatio === ratio ? 'border-yellow-500 bg-yellow-500/20' : 'border-gray-600 hover:border-yellow-500/50 hover:bg-gray-700/50'}`}>
                            <AspectRatioIcon ratio={ratio} />
                            <span className="text-sm font-semibold">{ratio}</span>
                            <span className="text-xs text-gray-400">
                                {ratio === '1:1' && 'Square'}
                                {ratio === '9:16' && 'Story'}
                                {ratio === '16:9' && 'Landscape'}
                                {ratio === '3:4' && 'Portrait'}
                            </span>
                        </button>
                    ))}
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center text-lg"
              >
                {isLoading ? 'बनाया जा रहा है...' : '✨ छवि बनाएं'}
              </button>
              
               <div>
                 <h3 className="text-sm font-medium text-gray-400 mb-2 mt-4 text-center">या कुछ नया आज़माएं</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {examplePrompts.map((ex, i) => (
                        <button key={i} onClick={() => setPrompt(ex)}
                            className="text-left text-sm bg-gray-700/50 hover:bg-gray-700 border border-gray-600 p-2 rounded-md transition-colors duration-200">
                            {ex}
                        </button>
                    ))}
                 </div>
               </div>

            </div>
            
            <div className="flex items-center justify-center bg-gray-700/50 rounded-xl border border-dashed border-gray-600 min-h-[350px] lg:min-h-full p-4 transition-all duration-300">
              {isLoading && <Loader message={loadingMessage} />}
              {error && <p className="text-red-400 text-center">{error}</p>}
              {!isLoading && !error && generatedImageUrl && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <img src={generatedImageUrl} alt="Generated" className="rounded-lg shadow-xl max-w-full h-auto" />
                   <a
                    href={generatedImageUrl}
                    download="adhyatmik_image.jpg"
                    className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                  >
                    <DownloadIcon />
                    इमेज डाउनलोड करें
                  </a>
                </div>
              )}
               {!isLoading && !error && !generatedImageUrl && (
                <div className="text-center text-gray-500">
                    <p>आपकी बनाई दिव्य कलाकृति यहां प्रकट होगी।</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
