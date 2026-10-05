@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------
@IF "%__MVNW_ARG0_NAME__%"=="" (SET "__MVNW_ARG0_NAME__=%~nx0")
@SET DP0=%~dp0
@SET MAVEN_PROJECTBASEDIR=%DP0%
@IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%
@IF "%MAVEN_WRAPPER_JAR%"=="" (
  SET MAVEN_WRAPPER_JAR="%DP0%.mvn\wrapper\maven-wrapper.jar"
)
@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain
@IF "%JAVA_HOME%"=="" (SET "JAVACMD=java") ELSE (SET "JAVACMD=%JAVA_HOME%\bin\java.exe")
"%JAVACMD%" -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" -classpath %MAVEN_WRAPPER_JAR% %WRAPPER_LAUNCHER% %*
