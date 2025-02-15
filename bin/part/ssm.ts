import {
  GetParameterCommand,
  ParameterNotFound,
  ParameterType,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: 'ap-northeast-1' });

const checkParameterExists = async (name: string) => {
  const command = new GetParameterCommand({
    Name: name,
  });
  try {
    const result = await ssmClient.send(command);
    return result.Parameter !== undefined;
  } catch (e) {
    if (e instanceof ParameterNotFound) {
      return false;
    }
    throw e;
  }
};

const putParameter = async (name: string, value: string) => {
  const command = new PutParameterCommand({
    Name: name,
    Value: value,
    Type: ParameterType.STRING,
    Overwrite: false,
  });

  await ssmClient.send(command);
};

export const prepareParameter = async (name: string) => {
  const exists = await checkParameterExists(name);
  if (exists) {
    return;
  }
  await putParameter(name, 'dummy');
};
