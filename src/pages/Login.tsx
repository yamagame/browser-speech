import { Button } from "components/Button";
import { Input } from "components/Input";
import axios from "axios";
import { useHistory } from "react-router-dom";

export type LoginProps = {
  username: string;
  onChangeUsername: React.ChangeEventHandler;
};

export const Login: React.FC<LoginProps> = ({ username, onChangeUsername }) => {
  const history = useHistory();

  const onClickLogin = async () => {
    try {
      await axios.post("/login", { username });
      history.push("/");
    } catch (err) {
      history.push("/login");
    }
  };

  return (
    <>
      <Input
        className="m-8 p-4 text-xl"
        value={username}
        placeholder="ユーザー名"
        onChange={onChangeUsername}
      />
      <Button
        className="text-gray-500 px-8"
        label={"ログイン"}
        onClick={onClickLogin}
      ></Button>
    </>
  );
};
