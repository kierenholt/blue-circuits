


class Scene1 extends Phaser.Scene {
    studGrid: any[][];
    components: DraggableComponent[] = [];
    key_W: Phaser.Input.Keyboard.Key;
    key_S: any;
    ts: Phaser.GameObjects.TileSprite;
    pos: number;
    seed = 0;
    
    constructor() {
        super({
            key: 'sceneA',
            active: true,
            physics:
            {
                default: 'arcade',
                arcade:
                    {
                        debug: false,
                    }
            },
        });
    }

    preload () {
        this.load.image("resistor","assets/resistor.png");
        this.load.image("stud","assets/stud.png");
        this.load.image("cell","assets/cell.png");
        this.load.image("wire","assets/wire.png");
        this.load.image("capacitor","assets/capacitor.png");
        this.load.image("switch-open","assets/switch-open.png");
        this.load.image("switch-closed","assets/switch-closed.png");
        this.load.image("bulb","assets/bulb.png");
        this.load.image("ammeter","assets/ammeter.png");
        this.load.image("voltmeter","assets/voltmeter.png");
        this.load.image("electron","assets/electron.png");
        this.load.atlas("fire", "assets/FireSprites.png", "assets/FireSprites.json");


    }
    
    create () {
        this.cameras.main.setBackgroundColor('#ffffff');


        this.anims.create({ key: 'allFire', 
            frames: this.anims.generateFrameNames('fire'), 
            repeat: -1,
            frameRate: 10
        });

        //draw grid
        this.studGrid = [[],[],[],[],[],[]];
        
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j < 6; j++) {
                this.studGrid[i][j] = new Stud(this,STUD_GRID_START_X+i*125,STUD_GRID_START_Y+j*125);
            }
        }

        //draggable components
        var spawnY = 150;
        new Resistor(this,850,spawnY);
        new Wire(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Cell(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Capacitor(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Switch(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Bulb(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Voltmeter(this,850,spawnY += SPAWN_VERTICAL_SPACING);
        new Ammeter(this,850,spawnY += SPAWN_VERTICAL_SPACING);




    }

    update () {

        //recalculate voltages MANY TIMES
        if (this.components.length > 0) {
            for (var i = 0; i < CIRCUIT_UPDATES_PER_FRAME; i++) {
                this.seed = randomOrderForEach(this.seed,this.components,c => c.updateStuds());
            }
        }

        //update electrons ONCE
        this.components.forEach( c => {
            c.updateElectrons();
        });

        //recalibrate all studs to zero
        var minStud = this.studGrid[0][0];
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j < 6; j++) {
                if (this.studGrid[i][j].voltageText.visible && this.studGrid[i][j].charge < minStud.charge) {
                    minStud = this.studGrid[i][j];
                }
            }
        }
        this.addToAllStuds(-1*minStud.charge);

    }

    setAllStudsToZero() {
        this.studGrid.forEach(row => {
            row.forEach(stud => {
                stud.charge = 0;
            })
        })
    }


    addToAllStuds(value) {
        this.studGrid.forEach(row => {
            row.forEach(stud => {
                stud.charge += value;
            })
        })
    }
}