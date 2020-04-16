
class myGame extends Phaser.Game {
  constructor() {
    let config = {
    
      type    : Phaser.AUTO,
      width   : 1000,
      height  : 750,
          
      autoFocus: true,

      backgroundColor: '#ffffff',
      parent  : 'gameDiv',
      
      url     : 'http//url.to.game',
      title   : 'Title Goes Here',
      version : '0.0.1', 

      scene   : [ new Scene1() ]
    };
    super(config);
  }
}
  
  