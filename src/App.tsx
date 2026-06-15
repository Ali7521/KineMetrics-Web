import { useEffect, useRef, useState } from 'react';
import { initializePoseEngine, calculateAngle } from './core/poseEngine';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { Activity, Camera, RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [angle, setAngle] = useState<number>(0);
  
  useEffect(() => {
    let landmarker: PoseLandmarker;
    let animationId: number;
    
    const init = async () => {
      landmarker = await initializePoseEngine();
      setIsLoaded(true);
      startCamera();
    };
    
    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      } catch (err) {
        console.error("Error accessing webcam: ", err);
      }
    };
    
    const predictWebcam = async () => {
      if (!videoRef.current || !canvasRef.current || !landmarker) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      let lastVideoTime = -1;
      
      const renderLoop = async () => {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const results = landmarker.detectForVideo(video, performance.now());
          
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.landmarks && results.landmarks[0]) {
            const landmarks = results.landmarks[0];
            const drawingUtils = new DrawingUtils(ctx);
            
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
              color: 'rgba(255, 255, 255, 0.8)',
              lineWidth: 3
            });
            
            drawingUtils.drawLandmarks(landmarks, {
              color: '#ef4444',
              lineWidth: 2,
              radius: 4
            });
            
            // Left Arm Angle (Shoulder: 11, Elbow: 13, Wrist: 15)
            const shoulder = landmarks[11];
            const elbow = landmarks[13];
            const wrist = landmarks[15];
            
            if (shoulder && elbow && wrist) {
              const currentAngle = calculateAngle(shoulder, elbow, wrist);
              setAngle(Math.round(currentAngle));
              
              // Draw angle on canvas near elbow
              ctx.fillStyle = "#3b82f6";
              ctx.font = "bold 28px Inter";
              ctx.fillText(`${Math.round(currentAngle)}°`, elbow.x * canvas.width + 15, elbow.y * canvas.height + 15);
            }
          }
          ctx.restore();
        }
        animationId = requestAnimationFrame(renderLoop);
      };
      
      renderLoop();
    };
    
    init();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>KineMetrics Web</h1>
        <p>Real-Time AI Biomechanics & Pose Estimation</p>
      </header>

      <main className="main-content">
        <div className="video-container glass-panel">
          {!isLoaded && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Loading MediaPipe AI Model...</p>
            </div>
          )}
          <video 
            ref={videoRef} 
            className="webcam-video" 
            autoPlay 
            playsInline
            muted
          />
          <canvas 
            ref={canvasRef} 
            className="output-canvas"
          />
        </div>

        <div className="dashboard glass-panel">
          <div className="metric-card">
            <span className="metric-label">
              <Activity size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: '-3px'}}/>
              Left Arm Angle
            </span>
            <span className="metric-value">{angle}°</span>
          </div>

          <div className="controls">
            <button className="btn btn-primary">
              <Camera size={18} />
              Capture
            </button>
            <button className="btn btn-secondary">
              <RefreshCw size={18} />
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
