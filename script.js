class DogBunnyGame {
    constructor() {
        this.levels = [
            // 关卡1：基础关卡
            {
                animals: {
                    rabbit1: 'house',
                    rabbit2: 'boat',
                    dog1: 'tree'
                },
                name: '基础关卡'
            },
            // 关卡2：进阶关卡
            {
                animals: {
                    rabbit1: 'flower',
                    rabbit2: 'well',
                    dog1: 'house'
                },
                name: '进阶关卡'
            },
            // 关卡3：困难关卡
            {
                animals: {
                    rabbit1: 'well',
                    rabbit2: 'tree',
                    dog1: 'flower'
                },
                name: '困难关卡'
            }
        ];

        this.currentLevel = 0;
        this.gameState = {
            animals: {...this.levels[0].animals},
            moveCount: 0,
            gameWon: false
        };
        
        // 游戏规则定义
        this.connections = {
            // 无条件连接
            unconditional: [
                ['bone', 'boat'],
                ['flower', 'boat'],
                ['carrot', 'tree'],
                ['tree', 'well'],
                ['well', 'flower']
            ],
            // 条件连接
            conditional: [
                {from: 'house', to: 'bone', condition: 'carrot'},
                {from: 'house', to: 'boat', condition: 'tree'},
                {from: 'boat', to: 'house', condition: 'tree'},
                {from: 'tree', to: 'house', condition: ['bone', 'flower']},
                {from: 'well', to: 'carrot', condition: '!bone'}
            ]
        };
        
        this.winCondition = {
            rabbit: 'carrot',
            dog: 'bone'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.updateLevelDisplay();
        this.positionAnimals();
        // 延迟更新连接线视觉效果，确保DOM已加载
        setTimeout(() => {
            this.updateConnectionVisuals();
        }, 100);
    }
    
    setupEventListeners() {
        // 拖拽事件
        document.querySelectorAll('.animal').forEach(animal => {
            animal.addEventListener('dragstart', this.handleDragStart.bind(this));
            animal.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // 放置事件
        document.querySelectorAll('.location').forEach(location => {
            location.addEventListener('dragover', this.handleDragOver.bind(this));
            location.addEventListener('drop', this.handleDrop.bind(this));
            location.addEventListener('dragenter', this.handleDragEnter.bind(this));
            location.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
        
        // 按钮事件
        document.getElementById('resetBtn').addEventListener('click', this.resetGame.bind(this));
        document.getElementById('hintBtn').addEventListener('click', this.showHint.bind(this));
        document.getElementById('nextLevelBtn').addEventListener('click', this.nextLevel.bind(this));
        document.getElementById('levelSelect').addEventListener('change', this.changeLevel.bind(this));
        document.getElementById('playAgain').addEventListener('click', this.resetGame.bind(this));
        document.getElementById('nextLevelVictory').addEventListener('click', this.nextLevel.bind(this));
        document.getElementById('closeRules').addEventListener('click', this.closeRules.bind(this));
        document.getElementById('closeHint').addEventListener('click', this.closeHint.bind(this));
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.target.classList.add('dragging');
        this.updateConnectionVisuals();
        this.showAvailablePaths(e.target.id);
    }

    showAvailablePaths(animalId) {
        const currentLocation = this.gameState.animals[animalId];

        // 清除之前的预览
        document.querySelectorAll('.connection.preview').forEach(conn => {
            conn.classList.remove('preview');
        });

        // 显示可用路径
        const allConnections = [...this.connections.unconditional, ...this.connections.conditional];

        // 检查无条件连接
        this.connections.unconditional.forEach(connection => {
            if (connection[0] === currentLocation || connection[1] === currentLocation) {
                this.highlightPath(currentLocation, connection[0] === currentLocation ? connection[1] : connection[0]);
            }
        });

        // 检查条件连接
        this.connections.conditional.forEach(connection => {
            if (connection.from === currentLocation && this.checkCondition(connection.condition)) {
                this.highlightPath(currentLocation, connection.to);
            }
        });
    }

    highlightPath(from, to) {
        // 根据起点和终点找到对应的连接线并高亮
        const pathMappings = {
            'house-bone': ['house', 'bone'],
            'house-boat': ['house', 'boat'],
            'boat-house': ['boat', 'house'],
            'tree-house': ['tree', 'house'],
            'well-carrot': ['well', 'carrot']
        };

        Object.entries(pathMappings).forEach(([id, [pathFrom, pathTo]]) => {
            if ((pathFrom === from && pathTo === to) || (pathTo === from && pathFrom === to)) {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('preview');
                }
            }
        });

        // 也高亮无条件连接（这些没有ID，需要通过其他方式处理）
        // 这里可以根据需要添加更多逻辑
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.clearLocationHighlights();
        this.clearPathPreviews();
    }

    clearPathPreviews() {
        document.querySelectorAll('.connection.preview').forEach(conn => {
            conn.classList.remove('preview');
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDragEnter(e) {
        const animalId = document.querySelector('.dragging')?.id;
        if (animalId) {
            const currentLocation = this.gameState.animals[animalId];
            const targetLocation = e.target.closest('.location').dataset.location;
            
            if (this.canMove(currentLocation, targetLocation)) {
                e.target.closest('.location').classList.add('drop-target');
            } else {
                e.target.closest('.location').classList.add('invalid-target');
            }
        }
    }
    
    handleDragLeave(e) {
        e.target.closest('.location').classList.remove('drop-target', 'invalid-target');
    }
    
    handleDrop(e) {
        e.preventDefault();
        const animalId = e.dataTransfer.getData('text/plain');
        const targetLocation = e.target.closest('.location').dataset.location;
        const currentLocation = this.gameState.animals[animalId];
        
        if (this.canMove(currentLocation, targetLocation)) {
            this.moveAnimal(animalId, targetLocation);
        }
        
        this.clearLocationHighlights();
    }
    
    canMove(from, to) {
        if (from === to) return false;
        
        // 检查无条件连接
        for (let connection of this.connections.unconditional) {
            if ((connection[0] === from && connection[1] === to) ||
                (connection[0] === to && connection[1] === from)) {
                return true;
            }
        }
        
        // 检查条件连接
        for (let connection of this.connections.conditional) {
            if (connection.from === from && connection.to === to) {
                return this.checkCondition(connection.condition);
            }
        }
        
        return false;
    }
    
    checkCondition(condition) {
        if (typeof condition === 'string') {
            if (condition.startsWith('!')) {
                // 否定条件：指定位置没有动物
                const location = condition.substring(1);
                return !this.hasAnimalAt(location);
            } else {
                // 正面条件：指定位置有动物
                return this.hasAnimalAt(condition);
            }
        } else if (Array.isArray(condition)) {
            // 数组条件：所有位置都要有动物
            return condition.every(loc => this.hasAnimalAt(loc));
        }
        return false;
    }
    
    hasAnimalAt(location) {
        return Object.values(this.gameState.animals).includes(location);
    }
    
    moveAnimal(animalId, targetLocation) {
        this.gameState.animals[animalId] = targetLocation;
        this.gameState.moveCount++;

        // 添加移动动画效果
        const animalElement = document.getElementById(animalId);
        animalElement.style.transition = 'all 0.5s ease';

        // 播放移动音效（模拟）
        this.playMoveSound();

        this.updateDisplay();
        this.positionAnimals();
        this.updateConnectionVisuals();
        this.checkWinCondition();
    }

    playMoveSound() {
        // 创建简单的音效反馈
        try {
            const audio = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audio.createOscillator();
            const gainNode = audio.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audio.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audio.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);

            oscillator.start(audio.currentTime);
            oscillator.stop(audio.currentTime + 0.1);
        } catch (e) {
            // 如果音频不支持，静默失败
            console.log('Audio not supported');
        }
    }
    
    updateDisplay() {
        document.getElementById('moveCount').textContent = this.gameState.moveCount;
    }
    
    positionAnimals() {
        Object.entries(this.gameState.animals).forEach(([animalId, location]) => {
            const animalElement = document.getElementById(animalId);
            const locationElement = document.getElementById(location);
            const container = locationElement.querySelector('.animals-container');
            
            // 清除动物的当前位置
            animalElement.style.position = 'static';
            animalElement.style.transform = '';
            
            // 将动物添加到新位置的容器中
            container.appendChild(animalElement);
        });
    }
    
    checkWinCondition() {
        const rabbitsAtCarrot = Object.entries(this.gameState.animals)
            .filter(([id, location]) => id.includes('rabbit') && location === 'carrot')
            .length;
            
        const dogsAtBone = Object.entries(this.gameState.animals)
            .filter(([id, location]) => id.includes('dog') && location === 'bone')
            .length;
        
        const totalRabbits = Object.keys(this.gameState.animals)
            .filter(id => id.includes('rabbit')).length;
            
        const totalDogs = Object.keys(this.gameState.animals)
            .filter(id => id.includes('dog')).length;
        
        if (rabbitsAtCarrot === totalRabbits && dogsAtBone === totalDogs) {
            this.gameWon = true;
            this.showVictory();
        }
    }
    
    showVictory() {
        document.getElementById('finalMoves').textContent = this.gameState.moveCount;

        // 添加庆祝动画
        this.createCelebrationEffect();

        // 播放胜利音效
        this.playVictorySound();

        setTimeout(() => {
            document.getElementById('victoryModal').style.display = 'flex';
        }, 500);
    }

    createCelebrationEffect() {
        // 创建彩带效果
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'][Math.floor(Math.random() * 5)];
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '9999';
            confetti.style.borderRadius = '50%';

            document.body.appendChild(confetti);

            // 动画
            confetti.animate([
                { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
            ], {
                duration: 3000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => confetti.remove();
        }
    }

    playVictorySound() {
        // 创建胜利音效
        try {
            const audio = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C

            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audio.createOscillator();
                    const gainNode = audio.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audio.destination);

                    oscillator.frequency.value = freq;
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0.2, audio.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.3);

                    oscillator.start(audio.currentTime);
                    oscillator.stop(audio.currentTime + 0.3);
                }, index * 150);
            });
        } catch (e) {
            // 如果音频不支持，静默失败
            console.log('Audio not supported');
        }
    }
    
    resetGame() {
        this.gameState = {
            animals: {...this.levels[this.currentLevel].animals},
            moveCount: 0,
            gameWon: false
        };

        document.getElementById('victoryModal').style.display = 'none';
        this.updateDisplay();
        this.positionAnimals();
        this.updateLevelDisplay();
        // 延迟更新连接线视觉效果
        setTimeout(() => {
            this.updateConnectionVisuals();
        }, 100);
    }

    nextLevel() {
        if (this.currentLevel < this.levels.length - 1) {
            this.currentLevel++;
            this.resetGame();
        } else {
            // 所有关卡完成
            alert('🎉 恭喜！你已经完成了所有关卡！');
        }
    }

    updateLevelDisplay() {
        const levelName = this.levels[this.currentLevel].name;
        document.querySelector('header p').textContent =
            `${levelName} - 将兔子移动到胡萝卜🥕，将狗移动到骨头🦴`;
        document.getElementById('levelSelect').value = this.currentLevel;
    }

    changeLevel(e) {
        this.currentLevel = parseInt(e.target.value);
        this.resetGame();
    }
    
    showHint() {
        const hint = this.getSmartHint();
        document.getElementById('hintText').textContent = hint;
        document.getElementById('hintPanel').style.display = 'flex';
    }

    getSmartHint() {
        // 分析当前游戏状态，提供智能提示
        const rabbitsAtCarrot = Object.entries(this.gameState.animals)
            .filter(([id, location]) => id.includes('rabbit') && location === 'carrot').length;
        const dogsAtBone = Object.entries(this.gameState.animals)
            .filter(([id, location]) => id.includes('dog') && location === 'bone').length;

        // 如果狗还没到骨头
        if (dogsAtBone === 0) {
            if (!this.hasAnimalAt('carrot')) {
                return "先将一只兔子移动到胡萝卜，这样狗就可以从房子移动到骨头了";
            } else {
                return "现在胡萝卜处有动物了，可以将狗从房子移动到骨头";
            }
        }

        // 如果兔子还没全部到胡萝卜
        if (rabbitsAtCarrot < 2) {
            if (this.hasAnimalAt('bone')) {
                return "骨头处有动物时，井无法连接到胡萝卜。先移动其他动物";
            } else {
                return "现在可以通过井将兔子移动到胡萝卜了";
            }
        }

        return "继续尝试，你快成功了！";
    }
    
    closeHint() {
        document.getElementById('hintPanel').style.display = 'none';
    }
    
    closeRules() {
        document.getElementById('rulesPanel').style.display = 'none';
    }
    
    updateConnectionVisuals() {
        // 更新连接线的视觉状态
        const connectionMappings = [
            { id: 'house-bone', condition: 'carrot' },
            { id: 'house-boat', condition: 'tree' },
            { id: 'boat-house', condition: 'tree' },
            { id: 'tree-house', condition: ['bone', 'flower'] },
            { id: 'well-carrot', condition: '!bone' }
        ];

        connectionMappings.forEach(mapping => {
            const line = document.getElementById(mapping.id);
            if (line) {
                if (this.checkCondition(mapping.condition)) {
                    line.classList.add('active');
                    line.classList.remove('inactive');
                    // 更新箭头颜色
                    line.setAttribute('marker-end', 'url(#arrowhead-active)');
                } else {
                    line.classList.add('inactive');
                    line.classList.remove('active');
                    // 恢复原始箭头颜色
                    line.setAttribute('marker-end', 'url(#arrowhead-conditional)');
                }
            }
        });

        // 更新规则标注的颜色
        this.updateRuleLabels();
    }

    updateRuleLabels() {
        // 根据连接状态更新规则标注的颜色
        const labels = document.querySelectorAll('.rule-label');
        const connectionMappings = [
            { condition: 'carrot', labelIndex: 0 },
            { condition: 'tree', labelIndex: 1 },
            { condition: 'tree', labelIndex: 2 },
            { condition: ['bone', 'flower'], labelIndex: 3 },
            { condition: '!bone', labelIndex: 4 }
        ];

        connectionMappings.forEach((mapping, index) => {
            const label = labels[mapping.labelIndex];
            if (label) {
                if (this.checkCondition(mapping.condition)) {
                    label.style.fill = '#48bb78';
                    label.style.fontWeight = '900';
                } else {
                    label.style.fill = '#f56565';
                    label.style.opacity = '0.6';
                }
            }
        });
    }
    
    clearLocationHighlights() {
        document.querySelectorAll('.location').forEach(location => {
            location.classList.remove('drop-target', 'invalid-target');
        });
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new DogBunnyGame();
});

// 添加一些额外的交互效果
document.addEventListener('DOMContentLoaded', () => {
    // 显示规则按钮
    const showRulesBtn = document.createElement('button');
    showRulesBtn.textContent = '游戏规则';
    showRulesBtn.onclick = () => {
        document.getElementById('rulesPanel').style.display = 'flex';
    };
    document.querySelector('.controls').appendChild(showRulesBtn);
});
