import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let config: Record<string, string> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = {
    awsAccessKey: (await ctx.config.get('awsAccessKey')) ?? '',
    awsSecretKey: (await ctx.config.get('awsSecretKey')) ?? '',
    awsRegion: (await ctx.config.get('awsRegion')) ?? 'us-east-1',
    awsProfile: (await ctx.config.get('awsProfile')) ?? 'default',
  };
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

const aws_list_resources: Tool = {
  definition: {
    name: 'aws_list_resources',
    description: 'List resources by service',
    params: [
      {
        name: 'service',
        type: 'string',
        description: 'AWS service: ec2, s3, lambda, rds, cloudwatch, iam',
        required: true,
      },
      { name: 'region', type: 'string', description: 'AWS region', required: false },
      { name: 'filters', type: 'string', description: 'JSON filter criteria', required: false },
    ],
    capabilities: ['shell:run', 'network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const service = args.service as string;
      if (!service) {
        return {
          toolName: 'aws_list_resources',
          success: false,
          output: '',
          error: 'Service is required',
          durationMs: Date.now() - start,
        };
      }
      const region = (args.region as string) ?? config.awsRegion;
      const validServices = ['ec2', 's3', 'lambda', 'rds', 'cloudwatch', 'iam'];
      if (!validServices.includes(service)) {
        return {
          toolName: 'aws_list_resources',
          success: false,
          output: '',
          error: `Invalid service: ${service}`,
          durationMs: Date.now() - start,
        };
      }

      const cmdArgs = ['aws', service, '--region', region, '--output', 'json'];
      if (args.filters) {
        try {
          const f = JSON.parse(args.filters as string);
          cmdArgs.push('--filters', JSON.stringify(f));
        } catch {
          return {
            toolName: 'aws_list_resources',
            success: false,
            output: '',
            error: 'Invalid filters JSON',
            durationMs: Date.now() - start,
          };
        }
      }

      const listCommands: Record<string, string[]> = {
        ec2: ['ec2', 'describe-instances'],
        s3: ['s3api', 'list-buckets'],
        lambda: ['lambda', 'list-functions'],
        rds: ['rds', 'describe-db-instances'],
        cloudwatch: ['cloudwatch', 'describe-alarms'],
        iam: ['iam', 'list-users'],
      };
      const [svc, cmd] = listCommands[service];
      const p = new Deno.Command('aws', { args: [svc, cmd, '--region', region] });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'aws_list_resources',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'aws_list_resources',
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'aws_list_resources',
        success: false,
        output: '',
        error: `Failed to list resources: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const aws_describe: Tool = {
  definition: {
    name: 'aws_describe',
    description: 'Describe a specific resource',
    params: [
      { name: 'service', type: 'string', description: 'AWS service name', required: true },
      { name: 'resource_id', type: 'string', description: 'Resource identifier', required: true },
      { name: 'region', type: 'string', description: 'AWS region', required: false },
    ],
    capabilities: ['shell:run', 'network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const service = args.service as string;
      const resourceId = args.resource_id as string;
      const region = (args.region as string) ?? config.awsRegion;
      if (!service || !resourceId) {
        return {
          toolName: 'aws_describe',
          success: false,
          output: '',
          error: 'service and resource_id are required',
          durationMs: Date.now() - start,
        };
      }

      const describeCommands: Record<string, string[]> = {
        ec2: ['ec2', 'describe-instances', '--instance-ids', resourceId],
        s3: ['s3api', 'get-bucket-location', '--bucket', resourceId],
        lambda: ['lambda', 'get-function', '--function-name', resourceId],
        rds: ['rds', 'describe-db-instances', '--db-instance-identifier', resourceId],
        iam: ['iam', 'get-user', '--user-name', resourceId],
      };
      const cmdDesc = describeCommands[service];
      if (!cmdDesc) {
        return {
          toolName: 'aws_describe',
          success: false,
          output: '',
          error: `Unsupported service: ${service}`,
          durationMs: Date.now() - start,
        };
      }

      const p = new Deno.Command('aws', { args: [...cmdDesc, '--region', region] });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'aws_describe',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return { toolName: 'aws_describe', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'aws_describe',
        success: false,
        output: '',
        error: `Failed to describe: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const aws_get_logs: Tool = {
  definition: {
    name: 'aws_get_logs',
    description: 'Get CloudWatch logs',
    params: [
      {
        name: 'log_group',
        type: 'string',
        description: 'CloudWatch log group name',
        required: true,
      },
      { name: 'hours', type: 'number', description: 'Hours of logs to retrieve', required: false },
      {
        name: 'filter_pattern',
        type: 'string',
        description: 'Filter pattern for log events',
        required: false,
      },
    ],
    capabilities: ['shell:run', 'network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const logGroup = args.log_group as string;
      if (!logGroup) {
        return {
          toolName: 'aws_get_logs',
          success: false,
          output: '',
          error: 'log_group is required',
          durationMs: Date.now() - start,
        };
      }
      const hours = (args.hours as number) ?? 1;
      const startTime = Math.floor((Date.now() - hours * 3600000) / 1000);
      const args_list = [
        'logs',
        'filter-log-events',
        '--log-group-name',
        logGroup,
        '--start-time',
        String(startTime),
      ];
      if (args.filter_pattern) args_list.push('--filter-pattern', args.filter_pattern as string);

      const p = new Deno.Command('aws', { args: args_list });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'aws_get_logs',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return { toolName: 'aws_get_logs', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'aws_get_logs',
        success: false,
        output: '',
        error: `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const aws_list_buckets: Tool = {
  definition: {
    name: 'aws_list_buckets',
    description: 'List S3 buckets',
    params: [],
    capabilities: ['shell:run'],
  },
  execute: async (_args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const p = new Deno.Command('aws', { args: ['s3api', 'list-buckets'] });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'aws_list_buckets',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'aws_list_buckets',
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'aws_list_buckets',
        success: false,
        output: '',
        error: `Failed to list buckets: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const aws_invoke_lambda: Tool = {
  definition: {
    name: 'aws_invoke_lambda',
    description: 'Invoke Lambda function',
    params: [
      {
        name: 'function_name',
        type: 'string',
        description: 'Lambda function name',
        required: true,
      },
      { name: 'payload', type: 'string', description: 'JSON payload to send', required: false },
      { name: 'region', type: 'string', description: 'AWS region', required: false },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const functionName = args.function_name as string;
      if (!functionName) {
        return {
          toolName: 'aws_invoke_lambda',
          success: false,
          output: '',
          error: 'function_name is required',
          durationMs: Date.now() - start,
        };
      }
      const region = (args.region as string) ?? config.awsRegion;
      const payload = (args.payload as string) ?? '{}';
      const tmpFile = `/tmp/lambda_payload_${Date.now()}.json`;
      await Deno.writeTextFile(tmpFile, payload);
      try {
        const p = new Deno.Command('aws', {
          args: [
            'lambda',
            'invoke',
            '--function-name',
            functionName,
            '--region',
            region,
            '--payload',
            `file://${tmpFile}`,
            '--cli-binary-format',
            'raw-in-base64-out',
            '/tmp/lambda_response.json',
          ],
        });
        const { stderr } = await p.output();
        const err = new TextDecoder().decode(stderr);
        if (err) {
          return {
            toolName: 'aws_invoke_lambda',
            success: false,
            output: '',
            error: err,
            durationMs: Date.now() - start,
          };
        }
        const response = await Deno.readTextFile('/tmp/lambda_response.json');
        return {
          toolName: 'aws_invoke_lambda',
          success: true,
          output: response,
          durationMs: Date.now() - start,
        };
      } finally {
        try {
          await Deno.remove(tmpFile);
        } catch { /* ignore */ }
      }
    } catch (error) {
      return {
        toolName: 'aws_invoke_lambda',
        success: false,
        output: '',
        error: `Failed to invoke lambda: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const aws_cost_estimate: Tool = {
  definition: {
    name: 'aws_cost_estimate',
    description: 'Estimate monthly cost',
    params: [
      { name: 'service', type: 'string', description: 'AWS service to estimate', required: false },
      { name: 'region', type: 'string', description: 'AWS region', required: false },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const p = new Deno.Command('aws', {
        args: [
          'ce',
          'get-cost-and-usage',
          '--time-period',
          `Start=${new Date().toISOString().slice(0, 7)}-01,End=${
            new Date().toISOString().slice(0, 10)
          }`,
          '--granularity',
          'MONTHLY',
          '--metrics',
          'UnblendedCost',
        ],
      });
      const { stdout, stderr } = await p.output();
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'aws_cost_estimate',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      const output = new TextDecoder().decode(stdout);
      return {
        toolName: 'aws_cost_estimate',
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'aws_cost_estimate',
        success: false,
        output: '',
        error: `Failed to estimate cost: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const tools: Tool[] = [
  aws_list_resources,
  aws_describe,
  aws_get_logs,
  aws_list_buckets,
  aws_invoke_lambda,
  aws_cost_estimate,
];
