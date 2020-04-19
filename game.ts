
class myGame extends Phaser.Game {
  constructor() {
    let config = {
    
      type    : Phaser.CANVAS,
      width   : 850,
      height  : 750,
          
      autoFocus: true,

      backgroundColor: '#ffffff',
      parent  : 'gameDiv',
      
      url     : 'http//www.teachometer.co.uk/blue-circuit-simulator.html',
      title   : 'Blue Circuit simulator',
      version : '0.0.1', 

      scene   : [ new Scene1() ],

      canvas: document.getElementById("game") as HTMLCanvasElement
    };
    super(config);

  }
}
  
  