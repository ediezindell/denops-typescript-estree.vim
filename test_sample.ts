// test_sample.ts contains various patterns to test:
interface User { // TSInterfaceDeclaration
  id: number;
  name: string;
}

function createUser() { // FunctionDeclaration
  console.log("test"); // CallExpression[callee.object.name="console"]
  var oldStyle = 1; // VariableDeclaration[kind="var"]
  if (1 == 1) { // BinaryExpression[operator="=="]
    return true;
  }
}

const Component = () => { // ArrowFunctionExpression
  const [state] = useState(); // CallExpression[callee.name="useState"]
  return <div> Hello < /div>;    / / JSXElement;
};
