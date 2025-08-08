#!/usr/bin/env node

/**
 * Test script for multilingual configuration manager
 * Run with: node test-multilingual-config.js
 */

const { LocalConfigProvider } = require('./src/lib/config-manager');
const { MultilingualConfigurationManager } = require('./src/lib/multilingual-configuration-manager');
const { multilingualSetup } = require('./src/lib/multilingual-setup');

async function testConfiguration() {
  console.log('🧪 Testing Multilingual Configuration Manager...\n');

  try {
    // Test 1: Initialize setup
    console.log('1️⃣ Testing setup initialization...');
    const initResult = await multilingualSetup.initialize();
    
    console.log(`   Result: ${initResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${initResult.message}`);
    
    if (initResult.errors.length > 0) {
      console.log('   Errors:', initResult.errors);
    }
    
    if (initResult.warnings.length > 0) {
      console.log('   Warnings:', initResult.warnings);
    }
    
    console.log('');

    // Test 2: Check status
    console.log('2️⃣ Testing status check...');
    const status = await multilingualSetup.getStatus();
    
    console.log(`   Configured: ${status.configured ? '✅' : '❌'}`);
    console.log(`   Pipeline Ready: ${status.pipelineReady ? '✅' : '❌'}`);
    console.log('   Services:');
    
    Object.entries(status.services).forEach(([service, ready]) => {
      console.log(`     ${service}: ${ready ? '✅' : '❌'}`);
    });
    
    console.log('');

    // Test 3: Health check
    console.log('3️⃣ Testing health check...');
    const healthy = await multilingualSetup.healthCheck();
    console.log(`   Health: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    console.log('');

    // Test 4: Configuration generation
    console.log('4️⃣ Testing configuration generation...');
    const configManager = multilingualSetup.getConfigurationManager();
    
    try {
      const pipelineConfig = await configManager.generatePipelineConfig();
      console.log('   ✅ Pipeline configuration generated successfully');
      console.log('   Services configured:');
      console.log(`     - Translator: ${pipelineConfig.azure_translator.endpoint}`);
      console.log(`     - Storage: ${pipelineConfig.azure_storage.account_name}`);
      console.log(`     - Search: ${pipelineConfig.azure_search.service_name}`);
      console.log(`     - OpenAI: ${pipelineConfig.azure_openai.endpoint}`);
      console.log(`     - Document Intelligence: ${pipelineConfig.azure_document_intelligence.endpoint}`);
    } catch (error) {
      console.log(`   ❌ Configuration generation failed: ${error.message}`);
    }

    console.log('\n🎉 Configuration testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testConfiguration().catch(console.error);
}

module.exports = { testConfiguration };