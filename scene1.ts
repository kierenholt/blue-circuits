


class Scene1 extends Phaser.Scene {
    studGrid: Stud[][];
    activeComponents: DraggableComponent[] = [];
    dummyComponents: DraggableComponent[] = [];
    textObjects: Phaser.GameObjects.Text[] = [];
    electrons: Electron[] = [];
    pos: number;
    seed = 0;

    ELECTRONS_ARE_POSITIVE = false; //IMMEDIATELY EFFECTIVE
    ELECTRON_SPEED = 5; //IMMEDIATELY EFFECTIVE
    NUMBER_OF_ELECTRONS = 5; //up to 5 per wire, REQUIRES REFRESH ALL COMPONENTS
    FONT_SIZE = 12; //REQUIRES REFRESH STUD AND COMPONENT AND ELECTRON FONTS
    SHOW_STUD_VOLTAGES = false; //REQUIRES REFRESH STUD FONTS
    SHOW_STUDS = true; //REQUIRES REFRESH
    
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
        this.studGrid = [];
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            this.studGrid.push([]);
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                this.studGrid[i][j] = new Stud(this,STUD_GRID_START_X+i*125,STUD_GRID_START_Y+j*125);
            }
        }

        //draggable components
        new Resistor(this,SPAWN_X,SPAWN_Y);
        new Wire(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Cell(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Capacitor(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Switch(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Bulb(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Voltmeter(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Ammeter(this,SPAWN_X,SPAWN_Y += SPAWN_VERTICAL_SPACING);

    }

    update () {
        //recalculate voltages MANY TIMES
        if (this.activeComponents.length > 0) {
            for (var i = 0; i < CIRCUIT_UPDATES_PER_FRAME; i++) {
                this.seed = randomOrderForEach(this.seed,this.activeComponents,c => c.updateStuds());
            }
        }

        //update electrons ONCE
        this.activeComponents.forEach( c => {
            c.updateElectrons();
        });

        //recalibrate all studs to zero
        var minStud = this.studGrid[0][0];
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
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

    setNumberOfElectrons(value:number) {
        this.NUMBER_OF_ELECTRONS = value;
        for (var c of this.activeComponents) {
            c.electrons.forEach(e => { e.destroy(); });
            c.electrons = [];
            c.createNewElectrons();
        }
    }

    setFontSize(value:number) {
        this.FONT_SIZE = value;
        for (var t of this.textObjects) {
            t.setFontSize(this.FONT_SIZE);
        }
    }

    setStudVoltageVisible(value: boolean) {
        this.SHOW_STUD_VOLTAGES = value;
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                if (this.SHOW_STUD_VOLTAGES) {
                    this.studGrid[i][j].voltageText.setVisible(this.studGrid[i][j].hasAnyComponents());
                }
                else {
                    this.studGrid[i][j].voltageText.setVisible(false);
                }
            }
        }
    }

    setStudVisible(value: boolean) {
        this.SHOW_STUDS = value;
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                this.studGrid[i][j].setVisible(this.SHOW_STUDS);
            }
        }
    }
}