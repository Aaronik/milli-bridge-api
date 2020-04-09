import { gql } from 'apollo-server'
import { TestModuleExport } from 'test/runner'
import * as T from 'types'

const CREATE_QUESTIONNAIRE_ASSIGNMENT = gql`
  mutation CreateQuestionnaireAssignment($questionnaireId: Int!, $assigneeId: Int!) {
    createQuestionnaireAssignment(questionnaireId: $questionnaireId, assigneeId: $assigneeId)
  }
`

const DELETE_QUESTIONNAIRE_ASSIGNMENT = gql`
  mutation DeleteQuestionnaireAssignment($questionnaireId: Int!, $assigneeId: Int!) {
    deleteQuestionnaireAssignment(questionnaireId: $questionnaireId, assigneeId: $assigneeId)
  }
`

const MY_QUESTIONNAIRES = gql`
  query {
    questionnairesAssignedToMe {
      id
    }
  }
`

const ME = gql`
  query {
    me {
      id
    }
  }
`

const CREATE_QUESTIONNAIRE = gql`
  mutation CreateQuestionnaire($title: String, $questions: [QuestionInput]){
    createQuestionnaire(title: $title, questions: $questions) {
      id
    }
  }
`

const MY_QUESTIONNAIRE_ASSIGNMENTS = gql`
  query {
    questionnaireAssignmentsIMade {
      assigneeId
    }
  }
`

const QUESTIONNAIRE_TITLE = 'questionnaire title'

export const test: TestModuleExport = (test, query, mutate, knex, db, server) => {

  test('GQL Create a Questionnaire Assignment -> Retrieve the assignment as doctor/patient -> Delete the assignment', async t => {
    await db._util.clearDb()

    // Create the questionnaire
    const { data: { createQuestionnaire: { id: questionnaireId }}} = await mutate(server).noError()
      .asDoctor({ mutation: CREATE_QUESTIONNAIRE, variables: { title: QUESTIONNAIRE_TITLE, questions: [] }})

    // Grab the patient's id
    const { data: { me: { id: patientId }}} = await query(server).noError().asPatient({ query: ME })

    // Assign the questionnaire to the patient
    await mutate(server).noError().asDoctor({ mutation: CREATE_QUESTIONNAIRE_ASSIGNMENT, variables: { questionnaireId, assigneeId: patientId }})

    // Test to make sure the patient can see their new questionnaire
    {
      // Grab the questionnaire from the patient's perspective
      const { data: { questionnairesAssignedToMe }} = await query(server).noError().asPatient({ query: MY_QUESTIONNAIRES })
      t.deepEqual(questionnairesAssignedToMe, [{ id: questionnaireId }])
    }

    // Test to make sure the doctor can see the questionnaire that they assigned
    {
      const { data: { questionnaireAssignmentsIMade }} = await query(server).noError().asDoctor({ query: MY_QUESTIONNAIRE_ASSIGNMENTS })
      t.deepEqual(questionnaireAssignmentsIMade, [{ assigneeId: patientId }])
    }

    // Now we can delete the relation
    await mutate(server).noError().asDoctor({ mutation: DELETE_QUESTIONNAIRE_ASSIGNMENT, variables: { questionnaireId, assigneeId: patientId }})

    // Test that the questionnaire was successfully unassigned
    {
      const { data: { questionnairesAssignedToMe }} = await query(server).noError().asPatient({ query: MY_QUESTIONNAIRES })
      t.deepEqual(questionnairesAssignedToMe, [])
    }

    t.end()
  })

}

