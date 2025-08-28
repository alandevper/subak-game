import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import './App.css';

// 과일 종류 정의
const FRUITS = [
    { radius: 20, name: '체리', score: 10, nextFruitIndex: 1, image: '/fruits/00_cherry.png', originalWidth: 33, originalHeight: 46 },
    { radius: 30, name: '딸기', score: 20, nextFruitIndex: 2, image: '/fruits/01_strawberry.png', originalWidth: 43, originalHeight: 48 },
    { radius: 40, name: '포도', score: 30, nextFruitIndex: 3, image: '/fruits/02_grape.png', originalWidth: 61, originalHeight: 61 },
    { radius: 50, name: '귤', score: 40, nextFruitIndex: 4, image: '/fruits/03_gyool.png', originalWidth: 69, originalHeight: 76 },
    { radius: 60, name: '오렌지', score: 50, nextFruitIndex: 5, image: '/fruits/04_orange.png', originalWidth: 89, originalHeight: 95 },
    { radius: 70, name: '사과', score: 60, nextFruitIndex: 6, image: '/fruits/05_apple.png', originalWidth: 114, originalHeight: 117 },
    { radius: 80, color: '#DA70D6', name: '배', score: 70, nextFruitIndex: 7, image: '/fruits/06_pear.png', originalWidth: 129, originalHeight: 137 },
    { radius: 90, color: '#8A2BE2', name: '복숭아', score: 80, nextFruitIndex: 8, image: '/fruits/07_peach.png', originalWidth: 161, originalHeight: 156 },
    { radius: 100, color: '#4B0082', name: '파인애플', score: 90, nextFruitIndex: 9, image: '/fruits/08_pineapple.png', originalWidth: 177, originalHeight: 204 },
    { radius: 110, color: '#0000CD', name: '멜론', score: 100, nextFruitIndex: 10, image: '/fruits/09_melon.png', originalWidth: 220, originalHeight: 220 },
    { radius: 120, color: '#00BFFF', name: '수박', score: 110, nextFruitIndex: -1, image: '/fruits/10_watermelon.png', originalWidth: 259, originalHeight: 259 },
];

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 700;
const INITIAL_FRUIT_RANGE = 4; // 난이도 조절: 0부터 이 숫자 -1 까지의 과일이 나옵니다. (4로 설정 시 귤까지)
const WINNING_FRUIT_INDEX = 10; // 게임 성공 조건: 이 인덱스에 해당하는 과일이 생성되면 게임 성공 (10: 수박)

function App() {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef(Matter.Engine.create());
    const renderRef = useRef<Matter.Render | null>(null);
    const previewFruitRef = useRef<HTMLDivElement>(null); // 미리보기 과일 Ref 추가
    const lastMouseXRef = useRef(WORLD_WIDTH / 2); // 마지막 마우스 X 위치 Ref 추가

    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameSuccess, setGameSuccess] = useState(false);
    const [currentFruitIndex, setCurrentFruitIndex] = useState(Math.floor(Math.random() * INITIAL_FRUIT_RANGE));
    const [nextFruitIndex, setNextFruitIndex] = useState(Math.floor(Math.random() * INITIAL_FRUIT_RANGE));
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [canDrop, setCanDrop] = useState(true); // canDrop 상태 추가
    const [installPrompt, setInstallPrompt] = useState<any>(null); // PWA 설치 프롬프트 상태

    const gameOverRef = useRef(gameOver);
    gameOverRef.current = gameOver;

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    useEffect(() => {
        const setAppHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        window.addEventListener('resize', setAppHeight);
        setAppHeight();

        return () => window.removeEventListener('resize', setAppHeight);
    }, []);

    useEffect(() => {
        let loadedCount = 0;
        const totalImages = FRUITS.length;
        FRUITS.forEach((fruit) => {
            const img = new Image();
            img.src = fruit.image;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) setImagesLoaded(true);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${fruit.image}`);
                loadedCount++;
                if (loadedCount === totalImages) setImagesLoaded(true);
            };
        });
    }, []);

    const resetGame = useCallback(() => {
        const engine = engineRef.current;
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);

        const ground = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20, { isStatic: true, label: 'ground' });
        const leftWall = Matter.Bodies.rectangle(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, { isStatic: true, label: 'wall' });
        const rightWall = Matter.Bodies.rectangle(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, { isStatic: true, label: 'wall' });
        const gameOverLine = Matter.Bodies.rectangle(WORLD_WIDTH / 2, 60, WORLD_WIDTH, 2, { isStatic: true, isSensor: true, label: 'gameOverLine', render: { fillStyle: 'yellow' } });
        Matter.World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);

        setScore(0);
        setGameOver(false);
        setGameSuccess(false); // 게임 성공 상태 초기화
        setCurrentFruitIndex(Math.floor(Math.random() * INITIAL_FRUIT_RANGE));
        setNextFruitIndex(Math.floor(Math.random() * INITIAL_FRUIT_RANGE));
        setCanDrop(true); // 게임 재시작 시 canDrop을 true로 설정
    }, []);

    useEffect(() => {
        if (!imagesLoaded || !sceneRef.current) return;

        const engine = engineRef.current;
        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio,
            },
        });
        renderRef.current = render;

        const runner = Matter.Runner.create();
        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        resetGame();

        const collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
            if (gameOverRef.current) return;
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit-')) {
                    const fruitIndex = parseInt(bodyA.label.split('-')[1]);
                    const nextFruitData = FRUITS[fruitIndex]?.nextFruitIndex !== -1 ? FRUITS[FRUITS[fruitIndex].nextFruitIndex] : null;

                    if (nextFruitData) {
                        Matter.World.remove(engine.world, [bodyA, bodyB]);
                        const newFruit = Matter.Bodies.circle(
                            (bodyA.position.x + bodyB.position.x) / 2,
                            (bodyA.position.y + bodyB.position.y) / 2,
                            nextFruitData.radius,
                            {
                                label: `fruit-${FRUITS[fruitIndex].nextFruitIndex}`,
                                render: { sprite: { texture: nextFruitData.image, xScale: (nextFruitData.radius * 2) / nextFruitData.originalWidth, yScale: (nextFruitData.radius * 2) / nextFruitData.originalHeight } },
                                restitution: 0.2,
                            }
                        );
                        Matter.World.add(engine.world, newFruit);
                        setScore((prevScore) => prevScore + nextFruitData.score);

                        // 새로 생성된 과일이 성공 조건에 해당하면 게임 성공
                        if (FRUITS[fruitIndex].nextFruitIndex === WINNING_FRUIT_INDEX) {
                            setGameSuccess(true);
                        }
                    }
                }
            });
        };

        let gameOverTimeout: number | null = null;
        const afterUpdateHandler = () => {
            if (gameOverRef.current) return;

            const bodies = Matter.Composite.allBodies(engine.world);
            const fruitsAboveLine = bodies.some(body => 
                body.label.startsWith('fruit-') && 
                (body.position.y - (body.circleRadius ?? 0)) < 60
            );

            if (fruitsAboveLine) {
                if (!gameOverTimeout) {
                    gameOverTimeout = window.setTimeout(() => setGameOver(true), 3000);
                }
            } else if (gameOverTimeout) {
                clearTimeout(gameOverTimeout);
                gameOverTimeout = null;
            }
        };

        Matter.Events.on(engine, 'collisionStart', collisionHandler);
        Matter.Events.on(engine, 'afterUpdate', afterUpdateHandler);

        const handleResize = () => {
            if (sceneRef.current && renderRef.current) {
                const { clientWidth, clientHeight } = sceneRef.current;
                const scaleX = clientWidth / WORLD_WIDTH;
                const scaleY = clientHeight / WORLD_HEIGHT;
                const scale = Math.min(scaleX, scaleY);
                renderRef.current.canvas.style.transform = `scale(${scale})`;
                renderRef.current.canvas.style.left = `${(clientWidth - WORLD_WIDTH * scale) / 2}px`;
                renderRef.current.canvas.style.top = `${(clientHeight - WORLD_HEIGHT * scale) / 2}px`;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // 초기 로드 시 크기 조절

        return () => {
            window.removeEventListener('resize', handleResize);
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            render.canvas.remove();
            render.textures = {};
            Matter.Events.off(engine, 'collisionStart', collisionHandler);
            Matter.Events.off(engine, 'afterUpdate', afterUpdateHandler);
            if (gameOverTimeout) clearTimeout(gameOverTimeout);
        };
    }, [imagesLoaded, resetGame]);

    const addFruit = useCallback((x: number) => {
        if (gameOver || gameSuccess || !canDrop) return; // canDrop 상태 확인 및 게임 성공 시 과일 생성 방지
        setCanDrop(false); // 과일 생성 후 canDrop을 false로 설정

        const fruit = FRUITS[currentFruitIndex];
        const newFruit = Matter.Bodies.circle(x, 20, fruit.radius, {
            label: `fruit-${currentFruitIndex}`,
            render: { sprite: { texture: fruit.image, xScale: (fruit.radius * 2) / fruit.originalWidth, yScale: (fruit.radius * 2) / fruit.originalHeight } },
            restitution: 0.2,
        });
        Matter.World.add(engineRef.current.world, newFruit);
        
        setCurrentFruitIndex(nextFruitIndex);
        setNextFruitIndex(Math.floor(Math.random() * INITIAL_FRUIT_RANGE));

        // 0.5초 후 canDrop을 다시 true로 설정
        setTimeout(() => {
            setCanDrop(true);
        }, 500);
    }, [gameOver, gameSuccess, canDrop, currentFruitIndex, nextFruitIndex]);

    

    const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault(); // 터치 이벤트의 기본 동작(확대/스크롤, 클릭 이벤트 발생) 방지
        // 과일 추가 로직은 handleInteractionEnd로 이동
    }, []);

    const handleInteractionMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (gameOverRef.current || gameSuccess || !previewFruitRef.current || !renderRef.current || !sceneRef.current) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const gameContainerRect = sceneRef.current.getBoundingClientRect();

        // game-container 내부에서의 상대적인 X 좌표
        const relativeX = clientX - gameContainerRect.left;

        const canvas = renderRef.current.canvas;
        const scaleMatch = canvas.style.transform.match(/scale\((.+?)\)/);
        const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

        const fruit = FRUITS[currentFruitIndex];
        const preview = previewFruitRef.current;

        const previewSize = fruit.radius * 2 * currentScale;
        const previewX = relativeX - previewSize / 2;
        const previewY = 20 * currentScale;

        preview.style.backgroundImage = `url(${fruit.image})`;
        preview.style.width = `${previewSize}px`;
        preview.style.height = `${previewSize}px`;
        preview.style.left = `${previewX}px`;
        preview.style.top = `${previewY}px`;
        preview.style.display = 'block';

        // Calculate worldX based on relativeX and currentScale
        const worldX = relativeX / currentScale; 
        lastMouseXRef.current = worldX; // 마지막 마우스 X 위치 업데이트

    }, [currentFruitIndex, gameSuccess, gameOverRef]);

    const handleInteractionEnd = useCallback(() => {
        if (gameOverRef.current || gameSuccess || !canDrop) return; // 게임 오버이거나 드롭 불가능하면 리턴

        // 과일 추가
        addFruit(Math.max(FRUITS[currentFruitIndex].radius, Math.min(lastMouseXRef.current, WORLD_WIDTH - FRUITS[currentFruitIndex].radius)));

        
    }, [addFruit, canDrop, currentFruitIndex, gameOverRef, gameSuccess]);

    const hidePreview = useCallback(() => {
        if (previewFruitRef.current) {
            previewFruitRef.current.style.display = 'none';
        }
    }, []);

    useEffect(() => {
        if (!previewFruitRef.current || !imagesLoaded || !renderRef.current) return;

        const fruit = FRUITS[currentFruitIndex];
        const preview = previewFruitRef.current;

        preview.style.backgroundImage = `url(${fruit.image})`;

        const canvas = renderRef.current.canvas;
        const scaleMatch = canvas.style.transform.match(/scale\((.+?)\)/);
        const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

        const previewSize = fruit.radius * 2 * currentScale;
        preview.style.width = `${previewSize}px`;
        preview.style.height = `${previewSize}px`;

        // 게임 오버 또는 게임 성공 상태일 때 미리보기를 숨김
        if (!gameOverRef.current && !gameSuccess) {
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }

    }, [currentFruitIndex, imagesLoaded, gameOverRef, gameSuccess, renderRef]);

    useEffect(() => {
        const gameContainer = sceneRef.current;
        if (!gameContainer) return;

        const handleTouchStart = (e: TouchEvent) => handleInteractionStart(e as any);
        const handleTouchMove = (e: TouchEvent) => handleInteractionMove(e as any);
        const handleTouchEnd = () => handleInteractionEnd();

        gameContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        gameContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            gameContainer.removeEventListener('touchstart', handleTouchStart);
            gameContainer.removeEventListener('touchmove', handleTouchMove);
            gameContainer.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleInteractionStart, handleInteractionMove, handleInteractionEnd]);

    const handleInstallClick = async () => {
        if (!installPrompt) {
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    return (
        <div className="App">
            <div className="game-header">
                <h1>수박 게임</h1>
                <div className="header-buttons">
                    {(gameOver || gameSuccess) && (
                        <button onClick={resetGame} className="restart-button">다시 시작</button>
                    )}
                </div>
                <div className="game-stats">
                    <p>점수: {score}</p>
                    {(gameOver || gameSuccess) ? (
                        <div className="game-message-container">
                            <p style={{ color: gameOver ? 'red' : 'green' }}>{gameOver ? '게임 오버!' : '게임 성공!'}</p>
                        </div>
                    ) : (
                        <p>다음: {FRUITS[nextFruitIndex].name}</p>
                    )}
                </div>
            </div>
            <div
                className="game-container"
                ref={sceneRef}
                onMouseEnter={handleInteractionMove} // Show preview on mouse enter
                onMouseMove={handleInteractionMove}
                onMouseUp={handleInteractionEnd} // 마우스를 떼었을 때 과일 떨어뜨림
                onMouseLeave={hidePreview} // 마우스가 영역을 벗어났을 때 미리보기 숨김
                onTouchEnd={handleInteractionEnd} // 터치를 떼었을 때 과일 떨어뜨림
            >
                <div ref={previewFruitRef} className="preview-fruit"></div>
            </div>
            <div className="fruit-order-guide">
                <p>순서: {FRUITS.map(fruit => fruit.name).join(' > ')}</p>
            </div>
            {(!gameOver && !gameSuccess) && !imagesLoaded && <div className="loading-indicator">로딩 중...</div>}
            {installPrompt && (
                <button onClick={handleInstallClick} className="install-button">
                    앱 설치
                </button>
            )}
        </div>
    );
}

export default App;
