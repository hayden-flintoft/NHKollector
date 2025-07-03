const HealthMonitor = require('./service/health-monitor')
const chalk = require('chalk')

async function testHealthMonitor() {
  console.log(chalk.blue('🔍 Testing Health Monitor...\n'))
  
  const healthMonitor = new HealthMonitor({})
  
  try {
    const results = await healthMonitor.performHealthCheck()
    
    console.log(chalk.bold('Health Check Results:'))
    console.log(chalk.gray(`Timestamp: ${results.timestamp}`))
    console.log(chalk.bold(`Overall Status: ${results.overall === 'healthy' ? chalk.green('✅ HEALTHY') : chalk.red('❌ UNHEALTHY')}\n`))
    
    for (const [checkName, result] of Object.entries(results.checks)) {
      const status = result.healthy ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')
      console.log(`${status} ${checkName}: ${result.message}`)
      
      if (result.details) {
        console.log(chalk.gray(`   Details: ${JSON.stringify(result.details)}`))
      }
      
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`))
      }
      console.log()
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Health monitor test failed:'), error.message)
  }
}

// Run the test
testHealthMonitor()