const fs = require('fs'),
path = require('path');

module.exports = function AutoLoot(mod) {
	
	let config = require('./config.json'),
	location = {x: 9999, y: 9999, z: 9999},
	loop = null,
	loot = {},
	blacklist = [],
	hooks = [];
  
	for(var i = 0; i < config.blacklist.length; i++) if(!isNaN(config.blacklist[i])) blacklist.push(config.blacklist[i]);
  
	mod.command.add(['loot'], (cmd, arg1, arg2) => {
		arg1 = Number(arg1);
		switch(cmd) {
			case 'loot':
				mod.log(loot);
				break;
			case 'help':
				mod.command.message('loot | b, w, id, delay, auto, status | argument');
				break;
			case undefined:
				config.enable = !config.enable;
				mod.command.message((config.enable ? 'En' : 'Dis') + 'abled');
				break;
			case 'auto':
				config.enableAuto = !config.enableAuto;
				mod.command.message('Automatic looting ' + (config.enableAuto ? 'en' : 'dis') + 'abled');
				break;
			case 'id':
				config.showId = !config.showId;
				mod.command.message('Showing item IDs ' + (config.showId ? 'en' : 'dis') + 'abled');
				break;
			case 'delay':
				if(!isNaN(arg1))
				{
				  config.lootDelay = arg1;
				  mod.command.message('Set automatic loot attempt delay to ' + arg1 + ' ms.');
				}
				else mod.command.message('delay must be a number, loot 300');
				break;
			case 'status':
				mod.log(config.blacklist);
				mod.command.message('Module ' + (config.enable ? 'En' : 'Dis') + 'abled' + '\nAuto-loot ' + (config.enableAuto ? 'en' : 'dis') + 'abled' + '\nShow IDs ' + (config.showId ? 'en' : 'dis') + 'abled');
				break;
			case 'b':
				if(!blacklist.includes(arg1))
				{
				  if(!isNaN(arg1))
				  {
					  if(arg2)
					  {
						  config.blacklist.push(arg1, arg2);
						  mod.command.message('added item id: ' + arg1 + ' with description "' + arg2 + '" to blacklist');
					  }
					  else
					  {
						  config.blacklist.push(arg1);
						  mod.command.message('added item id: ' + arg1 + ' to blacklist');
					  }
					  blacklist.push(arg1);
				  }
				}
				else mod.command.message('item is already in the blacklist');
				break;
			case 'w':
				var i = config.blacklist.indexOf(arg1);
				if(!i && !isNaN(arg1))
				{
				if(isNaN(config.blacklist[i+1]))
				{
					mod.command.message('removed item id: ' + arg1 + ' with description: "' + config.blacklist[i+1] + '" from blacklist');
					config.blacklist.splice(i, 2);
				}
				else
				{
					mod.command.message('removed item id: ' + arg1 + ' from blacklist');
					config.blacklist.splice(i, 1);
				}
				i = blacklist.indexOf(arg1);
				blacklist.splice(i, 1);
				}
				else mod.command.message('id not found in blacklist');
				break;
		}
		if(!['status', 'help'].includes(cmd)) {
			fs.writeFile(path.join(__dirname, 'config.json'), (JSON.stringify(config, null, 2)), err => {
				if(err) return;
			});
		}
	});
	
	mod.game.on('enter_loading_screen', () => {
		mod.clearInterval(loop);
		loop = null;
		ClearHooks();
	});
	
	mod.hook('S_SPAWN_DROPITEM', 8, {order: 10}, (event) => {
		if(config.enable)
		{
			if(!blacklist.includes(event.item))
			{
				loot[event.gameId] = event;
				if(!loop && config.enableAuto)
				{
					if(hooks[0] === undefined)
					{
						hooks.push(mod.hook('C_PLAYER_LOCATION', 5, {order: 10}, (event) => {
							location = event.loc;
						}));
						
						hooks.push(mod.hook('S_DESPAWN_DROPITEM', 4, {order: 10}, (event) => {
							if(event.gameId in loot)
							{
								if(config.showId) mod.command.message('item: ' + loot[event.gameId].item);
								delete loot[event.gameId];
								if(!Object.keys(loot).length)
								{
									mod.clearInterval(loop);
									loop = null;
									ClearHooks();
								}
							}
						}));
					}
					loop = mod.setInterval(lootAll, config.lootDelay);
				}
			}
		}
	});
	
	mod.hook('C_TRY_LOOT_DROPITEM', 4, () => {
		if(config.enable && !config.enableAuto) lootAll();
	});
	
	function lootAll() {
		for(let item in loot)
		{
			if(!blacklist.includes(loot[item].item) && dist3D(location, loot[item].loc) < 110)
			{
				mod.toServer('C_TRY_LOOT_DROPITEM', 4, { gameId: loot[item].gameId });
				break;
			}
		}
	}
	
	function ClearHooks() {
		if(hooks[0] !== undefined)
		{
			mod.unhook(hooks[0]);
			mod.unhook(hooks[1]);
			hooks = [];
		}
		loot = {};
	}
	
	function dist3D(loc1, loc2) {
		return Math.sqrt(Math.pow(loc2.x - loc1.x, 2) +
		Math.pow(loc2.y - loc1.y, 2) +
		Math.pow(loc2.z - loc1.z, 2));
	}
}