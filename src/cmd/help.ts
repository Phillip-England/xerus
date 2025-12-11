import { Cmd } from '../grub/entrypoint'

export let help = new Cmd('help');
help.setAsDefault();
help.setOperation(async () => {
  console.log('xerus')
  console.log('xerus init <DIRPATH>')
})