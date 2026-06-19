import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-aws',
  pluginDir: '/tmp/plugins/cortex-plugin-aws',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length >= 1, true);
});

Deno.test('aws_list_resources — rejects empty service', async () => {
  const tool = findTool('aws_list_resources');
  const result = await tool.execute({ 'service': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('aws_describe — rejects empty service', async () => {
  const tool = findTool('aws_describe');
  const result = await tool.execute({ 'service': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('aws_get_logs — rejects empty log_group', async () => {
  const tool = findTool('aws_get_logs');
  const result = await tool.execute({ 'log_group': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('aws_list_buckets — tool is defined with name and description', () => {
  const tool = findTool('aws_list_buckets');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('aws_invoke_lambda — rejects empty function_name', async () => {
  const tool = findTool('aws_invoke_lambda');
  const result = await tool.execute({ 'function_name': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
