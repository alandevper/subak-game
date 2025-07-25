import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import './App.css';

// 과일 종류 정의
const FRUITS = [
  { radius: 20, color: '#FFD700', name: 'cherry', score: 10, nextFruitIndex: 1, image: '/fruits/00_cherry.png', originalWidth: 33, originalHeight: 46 },
  { radius: 30, color: '#FFA500', name: 'strawberry', score: 20, nextFruitIndex: 2, image: '/fruits/01_strawberry.png', originalWidth: 43, originalHeight: 48 },
  { radius: 40, color: '#FF4500', name: 'grape', score: 30, nextFruitIndex: 3, image: '/fruits/02_grape.png', originalWidth: 61, originalHeight: 61 },
  { radius: 50, color: '#FF0000', name: 'tangerine', score: 40, nextFruitIndex: 4, image: '/fruits/03_gyool.png', originalWidth: 69, originalHeight: 76 },
  { radius: 60, color: '#FF1493', name: 'orange', score: 50, nextFruitIndex: 5, image: '/fruits/04_orange.png', originalWidth: 89, originalHeight: 95 },
  { radius: 70, color: '#FF69B4', name: 'apple', score: 60, nextFruitIndex: 6, image: '/fruits/05_apple.png', originalWidth: 114, originalHeight: 117 },
  { radius: 80, color: '#DA70D6', name: 'pear', score: 70, nextFruitIndex: 7, image: '/fruits/06_pear.png', originalWidth: 129, originalHeight: 137 },
  { radius: 90, color: '#8A2BE2', name: 'peach', score: 80, nextFruitIndex: 8, image: '/fruits/07_peach.png', originalWidth: 161, originalHeight: 156 },
  { radius: 100, color: '#4B0082', name: 'pineapple', score: 90, nextFruitIndex: 9, image: '/fruits/08_pineapple.png', originalWidth: 177, originalHeight: 204 },
  { radius: 110, color: '#0000CD', name: 'melon', score: 100, nextFruitIndex: 10, image: '/fruits/09_melon.png', originalWidth: 220, originalHeight: 220 },
  { radius: 120, color: '#00BFFF', name: 'watermelon', score: 110, nextFruitIndex: -1, image: '/fruits/10_watermelon.png', originalWidth: 259, originalHeight: 259 },
];

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 700;

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  const [nextFruitIndex, setNextFruitIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canDrop, setCanDrop] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; radius: number }>>([]);

  const nextFruitIndexRef = useRef(nextFruitIndex);
  const gameOverRef = useRef(gameOver);
  const previewFruitRef = useRef<HTMLDivElement>(null);
  const canDropRef = useRef(canDrop);
  const scoreRef = useRef(score);
  const setScoreRef = useRef(setScore);
  const setGameOverRef = useRef(setGameOver);
  const gameOverTimerRef = useRef<number | null>(null);
  const loadedImages = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => { nextFruitIndexRef.current = nextFruitIndex; }, [nextFruitIndex]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { setScoreRef.current = setScore; }, [setScore]);
  useEffect(() => { setGameOverRef.current = setGameOver; }, [setGameOver]);
  useEffect(() => { canDropRef.current = canDrop; }, [canDrop]);

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = FRUITS.length;
    FRUITS.forEach((fruit) => {
      const img = new Image();
      img.src = fruit.image;
      img.onload = () => {
        loadedCount++;
        loadedImages.current[fruit.name] = img;
        if (loadedCount === totalImages) setImagesLoaded(true);
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${fruit.image}`);
        loadedCount++;
        if (loadedCount === totalImages) setImagesLoaded(true);
      };
    });
  }, []);

  const getScale = () => {
    if (!sceneRef.current) return 1;
    return sceneRef.current.clientWidth / WORLD_WIDTH;
  };

  const resetGame = useCallback(() => {
    const engine = engineRef.current;
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);

    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }

    const scale = getScale();
    const ground = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20, { isStatic: true, label: 'ground' });
    const leftWall = Matter.Bodies.rectangle(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, { isStatic: true, label: 'wall' });
    const rightWall = Matter.Bodies.rectangle(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, { isStatic: true, label: 'wall' });
    const gameOverLine = Matter.Bodies.rectangle(WORLD_WIDTH / 2, 50, WORLD_WIDTH, 10, { isStatic: true, isSensor: true, label: 'gameOverLine', render: { fillStyle: 'rgba(255, 255, 0, 0.8)' } });
    Matter.World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);

    setScore(0);
    setGameOver(false);
    setNextFruitIndex(Math.floor(Math.random() * 3));
    setCanDrop(true);
  }, []);

  const collisionHandler = useCallback((event: Matter.IEventCollision<Matter.Engine>) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;
      if (bodyA.label.startsWith('fruit-') && bodyB.label.startsWith('fruit-') && bodyA.label === bodyB.label) {
        const fruitIndex = parseInt(bodyA.label.split('-')[1]);
        const nextFruitData = FRUITS[fruitIndex]?.nextFruitIndex !== -1 ? FRUITS[FRUITS[fruitIndex].nextFruitIndex] : null;

        if (nextFruitData) {
          const collisionX = (bodyA.position.x + bodyB.position.x) / 2;
          const collisionY = (bodyA.position.y + bodyB.position.y) / 2;

          setParticles((prev) => [...prev, { id: Date.now() + Math.random(), x: collisionX, y: collisionY, color: nextFruitData.color, radius: nextFruitData.radius }]);
          
          Matter.World.remove(engineRef.current.world, [bodyA, bodyB]);

          const mergedFruit = Matter.Bodies.circle(collisionX, collisionY, nextFruitData.radius, {
            render: { sprite: { texture: nextFruitData.image, xScale: (nextFruitData.radius * 2) / nextFruitData.originalWidth, yScale: (nextFruitData.radius * 2) / nextFruitData.originalHeight } },
            label: `fruit-${FRUITS[fruitIndex].nextFruitIndex}`,
            restitution: 0.2,
            friction: 0.001,
            density: 0.001,
          });
          Matter.World.add(engineRef.current.world, mergedFruit);
          setScoreRef.current((prev) => prev + nextFruitData.score);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!imagesLoaded || !sceneRef.current) return;

    const engine = engineRef.current;
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: sceneRef.current.clientWidth,
        height: sceneRef.current.clientHeight,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);
    
    resetGame();

    Matter.Events.on(engine, 'collisionStart', collisionHandler);
    Matter.Events.on(engine, 'afterUpdate', () => {
      if (gameOverRef.current) return;
      let fruitAboveLine = false;
      const gameOverY = 50;
      for (const body of engine.world.bodies) {
        if (body.label.startsWith('fruit-') && body.position.y - (body.circleRadius ?? 0) < gameOverY) {
          fruitAboveLine = true;
          break;
        }
      }
      if (fruitAboveLine) {
        if (!gameOverTimerRef.current) {
          gameOverTimerRef.current = setTimeout(() => {
            setGameOverRef.current(true);
          }, 2000);
        }
      } else if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    });

    const handleResize = () => {
      if (renderRef.current && sceneRef.current) {
        renderRef.current.canvas.width = sceneRef.current.clientWidth;
        renderRef.current.canvas.height = sceneRef.current.clientHeight;
        Matter.Render.setPixelRatio(renderRef.current, window.devicePixelRatio);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Matter.Render.stop(renderRef.current!);
      renderRef.current?.canvas.remove();
      renderRef.current!.textures = {};
      Matter.Runner.stop(runnerRef.current!);
      Matter.Events.off(engine, 'collisionStart', collisionHandler);
      Matter.Events.off(engine, 'afterUpdate');
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
    };
  }, [imagesLoaded, resetGame, collisionHandler]);

  const handleDrop = useCallback((xPosition: number) => {
    if (gameOverRef.current || !canDropRef.current || !sceneRef.current) return;

    const scale = getScale();
    const fruit = FRUITS[nextFruitIndexRef.current];
    const newFruit = Matter.Bodies.circle(xPosition / scale, 50, fruit.radius, {
      render: { sprite: { texture: fruit.image, xScale: (fruit.radius * 2) / fruit.originalWidth, yScale: (fruit.radius * 2) / fruit.originalHeight } },
      label: `fruit-${nextFruitIndexRef.current}`,
      restitution: 0.2,
      friction: 0.001,
      density: 0.001,
    });
    Matter.World.add(engineRef.current.world, newFruit);

    setCanDrop(false);
    setTimeout(() => setCanDrop(true), 500);
    setNextFruitIndex(Math.floor(Math.random() * 3));
  }, []);

  useEffect(() => {
    const currentScene = sceneRef.current;
    if (!currentScene) return;

    const getEventX = (e: MouseEvent | TouchEvent) => {
      const rect = currentScene.getBoundingClientRect();
      if (e instanceof MouseEvent) return e.clientX - rect.left;
      return e.touches[0].clientX - rect.left;
    };

    const handleInteractionStart = (e: MouseEvent | TouchEvent) => {
      handleDrop(getEventX(e));
    };

    const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
      if (gameOverRef.current || !previewFruitRef.current || !imagesLoaded) return;
      const x = getEventX(e);
      const fruit = FRUITS[nextFruitIndexRef.current];
      const scale = getScale();
      previewFruitRef.current.style.left = `${x - (fruit.radius * scale)}px`;
      previewFruitRef.current.style.width = `${fruit.radius * 2 * scale}px`;
      previewFruitRef.current.style.height = `${fruit.radius * 2 * scale}px`;
    };
    
    const handleMouseEnter = () => { if (previewFruitRef.current) previewFruitRef.current.style.display = 'block'; };
    const handleMouseLeave = () => { if (previewFruitRef.current) previewFruitRef.current.style.display = 'none'; };

    currentScene.addEventListener('mousedown', handleInteractionStart);
    currentScene.addEventListener('touchstart', handleInteractionStart, { passive: true });
    currentScene.addEventListener('mousemove', handleInteractionMove);
    currentScene.addEventListener('touchmove', handleInteractionMove, { passive: true });
    currentScene.addEventListener('mouseenter', handleMouseEnter);
    currentScene.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      currentScene.removeEventListener('mousedown', handleInteractionStart);
      currentScene.removeEventListener('touchstart', handleInteractionStart);
      currentScene.removeEventListener('mousemove', handleInteractionMove);
      currentScene.removeEventListener('touchmove', handleInteractionMove);
      currentScene.removeEventListener('mouseenter', handleMouseEnter);
      currentScene.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleDrop, imagesLoaded]);

  useEffect(() => {
    if (!previewFruitRef.current || !imagesLoaded || !sceneRef.current) return;
    const fruit = FRUITS[nextFruitIndex];
    const scale = getScale();
    previewFruitRef.current.style.backgroundImage = `url(${fruit.image})`;
    previewFruitRef.current.style.width = `${fruit.radius * 2 * scale}px`;
    previewFruitRef.current.style.height = `${fruit.radius * 2 * scale}px`;
  }, [nextFruitIndex, imagesLoaded]);

  const scale = getScale();

  return (
    <div className="App">
      <h1>수박 게임</h1>
      <div ref={sceneRef} className="game-container">
        <div style={{ position: 'absolute', top: `${50 * scale}px`, left: 0, width: '100%', height: '2px', borderTop: '2px dashed yellow', zIndex: 0 }} />
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x * scale}px`,
              top: `${p.y * scale}px`,
              width: `${p.radius * 2 * scale}px`,
              height: `${p.radius * 2 * scale}px`,
              backgroundColor: p.color,
            }}
          />
        ))}
        <div ref={previewFruitRef} className="preview-fruit"></div>
      </div>
      <div className="game-info">
        <p>다음 과일: {FRUITS[nextFruitIndex].name}</p>
        <p>점수: {score}</p>
      </div>
      {gameOver && (
        <div className="game-over-container">
          <p>게임 오버!</p>
          <button onClick={resetGame}>게임 재시작</button>
        </div>
      )}
      {!imagesLoaded && <div className="loading-indicator">이미지 로딩 중...</div>}
    </div>
  );
}

export default App;
''