require('dotenv').config()
const chalk = require('chalk')
const NHKApi = require('../../src/api/nhk-api')

async function testNHKApi() {
  try {
    const nhk = new NHKApi()
    await nhk.init()

    // Test program list
    console.log(chalk.blue('\n📺 Testing program list...'))
    const programList = await nhk.getProgramList()
    console.log(chalk.green('✅ Got program list'))

    // Test some potential program IDs
    const testIds = ['95', '2007550']

    for (const id of testIds) {
      console.log(chalk.blue(`\n🔍 Testing program info for ID: ${id}`))
      try {
        const info = await nhk.getProgramInfo(id)
        console.log(chalk.green('✅ Got program info:'))
        console.log(chalk.gray('Title:'), info.program?.title)
        console.log(chalk.gray('Subtitle:'), info.program?.subtitle)
      } catch (error) {
        console.log(chalk.yellow(`⚠️ Failed to get info for ID ${id}`))
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
  }
}

testNHKApi()
